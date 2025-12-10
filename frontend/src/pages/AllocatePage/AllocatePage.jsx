import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Layout from "@/components/Layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, GripVertical, Loader2, Receipt, Users } from "lucide-react";
import { groupsAPI, expensesAPI, getCategoryById } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function AllocatePage() {
  const { user } = useUser();
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverMemberId, setDragOverMemberId] = useState(null);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Get initials from name
  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Get member name
  const getMemberName = (member) => {
    if (member.firstName) {
      return `${member.firstName} ${member.lastName || ""}`.trim();
    }
    return member.name || "Unknown";
  };

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!groupId || !user) return;

      try {
        setLoading(true);
        const [groupRes, expensesRes] = await Promise.all([
          groupsAPI.getById(groupId),
          expensesAPI.getAll(groupId),
        ]);

        const groupData = groupRes.group;
        setGroup(groupData);

        // Extract members from group
        const memberUsers = (groupData.members || [])
          .map((m) => m.user || m)
          .filter(Boolean);
        setMembers(memberUsers);

        // Transform expenses to include assignedTo array
        const expensesWithAssignments = (expensesRes.expenses || []).map((expense) => {
          // Get currently assigned member IDs from shares
          const assignedTo = (expense.shares || []).map((s) => s.userId || s.user?.id);
          return {
            ...expense,
            assignedTo,
          };
        });
        setExpenses(expensesWithAssignments);
      } catch (error) {
        console.error("Error fetching allocation data:", error);
        toast({
          title: "Error",
          description: "Failed to load allocation data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, user, toast]);

  // Check/uncheck an expense item
  const handleCheckItem = (expenseId, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, expenseId]);
    } else {
      setSelectedIds((prev) => prev.filter((id) => id !== expenseId));
    }
  };

  // Toggle item assignment for a member
  const toggleItemAssignmentForMember = (expenseId, memberId) => {
    setExpenses((prev) =>
      prev.map((expense) => {
        if (expense.id === expenseId) {
          const isAssigned = expense.assignedTo.includes(memberId);
          const newAssignedTo = isAssigned
            ? expense.assignedTo.filter((id) => id !== memberId)
            : [...expense.assignedTo, memberId];
          return { ...expense, assignedTo: newAssignedTo };
        }
        return expense;
      })
    );
  };

  // Apply assignment to all selected items
  const applyAssignmentToSelectedItems = (memberId) => {
    if (selectedIds.length === 0) return;

    const memberName = getMemberName(members.find((m) => m.id === memberId) || {});
    
    selectedIds.forEach((expenseId) => {
      toggleItemAssignmentForMember(expenseId, memberId);
    });

    toast({
      title: "Items updated",
      description: `${selectedIds.length} item(s) updated for ${memberName}`,
      variant: "success",
    });

    // Clear selection
    setSelectedIds([]);
  };

  // Handle member card click
  const handleMemberClick = (memberId) => {
    applyAssignmentToSelectedItems(memberId);
  };

  // Handle drag end
  const handleDragEnd = (result) => {
    setDragOverMemberId(null);

    if (!result.destination) return;

    const destinationId = result.destination.droppableId;

    // Check if dropped on a member card
    if (destinationId.startsWith("member-")) {
      const memberId = parseInt(destinationId.replace("member-", ""), 10);
      
      // If nothing selected, select the dragged item
      const draggedId = parseInt(result.draggableId.replace("expense-", ""), 10);
      
      if (selectedIds.length === 0) {
        // Just assign the dragged item
        toggleItemAssignmentForMember(draggedId, memberId);
        const memberName = getMemberName(members.find((m) => m.id === memberId) || {});
        toast({
          title: "Item assigned",
          description: `1 item updated for ${memberName}`,
          variant: "success",
        });
      } else {
        // Assign all selected items
        applyAssignmentToSelectedItems(memberId);
      }
    }
  };

  // Handle drag update for visual feedback
  const handleDragUpdate = (update) => {
    if (update.destination?.droppableId?.startsWith("member-")) {
      const memberId = parseInt(update.destination.droppableId.replace("member-", ""), 10);
      setDragOverMemberId(memberId);
    } else {
      setDragOverMemberId(null);
    }
  };

  // Check if any expense has assignments
  const hasAnyAssignment = expenses.some((e) => e.assignedTo.length > 0);

  // Count assignments per member
  const getAssignmentCount = (memberId) => {
    return expenses.filter((e) => e.assignedTo.includes(memberId)).length;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!hasAnyAssignment) return;

    setIsSaving(true);

    try {
      // Update each expense with its new split
      const updatePromises = expenses.map(async (expense) => {
        // Only update if there are assignments
        if (expense.assignedTo.length > 0) {
          return expensesAPI.update(expense.id, {
            splitBetween: expense.assignedTo,
            splitType: "equal",
          });
        }
        return Promise.resolve();
      });

      await Promise.all(updatePromises);

      toast({
        title: "Success",
        description: "Allocation saved successfully",
        variant: "success",
      });

      // Navigate back to group page
      navigate(`/groups/${groupId}`);
    } catch (error) {
      console.error("Error saving allocation:", error);
      toast({
        title: "Error",
        description: "There was an error saving your allocation",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-gray-500">Loading allocation data...</p>
        </div>
      </Layout>
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Group not found
          </h2>
          <p className="text-gray-500 mb-4">
            The group you're looking for doesn't exist.
          </p>
          <Button asChild>
            <Link to="/groups">Back to Groups</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <DragDropContext onDragEnd={handleDragEnd} onDragUpdate={handleDragUpdate}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to={`/groups/${groupId}`}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                Allocate Expenses
              </h1>
              <p className="text-gray-500">{group.name}</p>
            </div>
          </div>

          {/* Hint text */}
          <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            Select expenses using checkboxes, then click a member or drag items to assign them. 
            Items can be assigned to multiple members to split the cost.
          </p>

          {/* Two column layout */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left column - Expenses */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Group Expenses
                  </CardTitle>
                  <CardDescription>
                    {expenses.length} expense(s) • {selectedIds.length} selected
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenses.length > 0 ? (
                    <Droppable droppableId="expenses" isDropDisabled={true}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-2"
                        >
                          {expenses.map((expense, index) => {
                            const isSelected = selectedIds.includes(expense.id);
                            const category = getCategoryById(expense.category);
                            const assignedMembers = members.filter((m) =>
                              expense.assignedTo.includes(m.id)
                            );

                            return (
                              <Draggable
                                key={expense.id}
                                draggableId={`expense-${expense.id}`}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                                      isSelected && "bg-gray-50 border-primary/30",
                                      snapshot.isDragging && "shadow-lg bg-white"
                                    )}
                                  >
                                    {/* Drag handle */}
                                    <div
                                      {...provided.dragHandleProps}
                                      className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>

                                    {/* Checkbox */}
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) =>
                                        handleCheckItem(expense.id, checked)
                                      }
                                    />

                                    {/* Category icon */}
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                                      {category?.icon || "📦"}
                                    </div>

                                    {/* Description & amount */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {expense.description}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {formatCurrency(parseFloat(expense.amount))}
                                      </p>
                                    </div>

                                    {/* Assigned member avatars */}
                                    {assignedMembers.length > 0 && (
                                      <div className="flex -space-x-2">
                                        {assignedMembers.slice(0, 4).map((member) => (
                                          <Avatar
                                            key={member.id}
                                            className="h-7 w-7 border-2 border-white"
                                          >
                                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                              {getInitials(getMemberName(member))}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                        {assignedMembers.length > 4 && (
                                          <div className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                                            +{assignedMembers.length - 4}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No expenses to allocate</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        asChild
                      >
                        <Link to={`/groups/${groupId}`}>
                          Go back and add expenses
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right column - Members */}
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Group Members
                  </CardTitle>
                  <CardDescription>
                    {members.length} member(s)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const memberName = getMemberName(member);
                      const assignmentCount = getAssignmentCount(member.id);
                      const isDragOver = dragOverMemberId === member.id;

                      return (
                        <Droppable
                          key={member.id}
                          droppableId={`member-${member.id}`}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              onClick={() => handleMemberClick(member.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                "hover:bg-gray-50 hover:border-gray-300",
                                (snapshot.isDraggingOver || isDragOver) &&
                                  "bg-teal-50 border-teal-300",
                                selectedIds.length > 0 && "ring-2 ring-primary/20"
                              )}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(memberName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {memberName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {assignmentCount} expense(s) assigned
                                </p>
                              </div>
                              {assignmentCount > 0 && (
                                <Badge variant="secondary">
                                  {assignmentCount}
                                </Badge>
                              )}
                              {/* Hidden placeholder for drop */}
                              <div className="hidden">{provided.placeholder}</div>
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link to={`/groups/${groupId}`}>Cancel</Link>
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!hasAnyAssignment || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Confirm Splits"
              )}
            </Button>
          </div>
        </div>
      </DragDropContext>
    </Layout>
  );
}

export default AllocatePage;
