import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronLeft, ChevronRight, Receipt } from "lucide-react";
import { categories } from "@/lib/api";

function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  groups = [],
  selectedGroupId = null,
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Expense details
  const [expenseDetails, setExpenseDetails] = useState({
    description: "",
    category: "food",
    groupId: selectedGroupId?.toString() || "",
    date: new Date().toISOString().split("T")[0],
  });

  // Step 2: Items
  const [items, setItems] = useState([]);
  const [currentItem, setCurrentItem] = useState({
    name: "",
    price: "",
    allocatedTo: [],
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setExpenseDetails({
        description: "",
        category: "food",
        groupId: selectedGroupId?.toString() || "",
        date: new Date().toISOString().split("T")[0],
      });
      setItems([]);
      setCurrentItem({ name: "", price: "", allocatedTo: [] });
    }
  }, [open, selectedGroupId]);

  // Get selected group's members
  const selectedGroup = groups.find(
    (g) => g.id === parseInt(expenseDetails.groupId)
  );
  const members = (selectedGroup?.members || [])
    .map((m) => m.user || m)
    .filter(Boolean);

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberName = (member) => {
    return member.firstName
      ? `${member.firstName} ${member.lastName || ""}`.trim()
      : member.name || member.email || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Handle allocation toggle for current item
  const toggleAllocation = (userId) => {
    setCurrentItem((prev) => {
      const isAllocated = prev.allocatedTo.includes(userId);
      return {
        ...prev,
        allocatedTo: isAllocated
          ? prev.allocatedTo.filter((id) => id !== userId)
          : [...prev.allocatedTo, userId],
      };
    });
  };

  // Select all members for current item
  const selectAllMembers = () => {
    setCurrentItem((prev) => ({
      ...prev,
      allocatedTo: members.map((m) => m.id),
    }));
  };

  // Add item to list
  const addItem = () => {
    if (!currentItem.name || !currentItem.price || currentItem.allocatedTo.length === 0) {
      return;
    }
    setItems((prev) => [...prev, { ...currentItem, id: Date.now() }]);
    setCurrentItem({ name: "", price: "", allocatedTo: [] });
  };

  // Remove item from list
  const removeItem = (itemId) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Calculate totals
  const totalAmount = items.reduce(
    (sum, item) => sum + parseFloat(item.price || 0),
    0
  );

  // Calculate share per person
  const calculateUserShare = (userId) => {
    return items.reduce((sum, item) => {
      if (item.allocatedTo.includes(userId)) {
        return sum + parseFloat(item.price) / item.allocatedTo.length;
      }
      return sum;
    }, 0);
  };

  // Validation
  const canProceedToStep2 =
    expenseDetails.description && expenseDetails.groupId;
  const canSubmit = items.length > 0;

  // Handle form submission
  const handleSubmit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    try {
      await onSubmit({
        description: expenseDetails.description,
        category: expenseDetails.category,
        groupId: parseInt(expenseDetails.groupId),
        date: expenseDetails.date,
        items: items.map((item) => ({
          name: item.name,
          price: parseFloat(item.price),
          allocatedTo: item.allocatedTo,
        })),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating expense:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Add New Expense" : step === 2 ? "Add Items" : "Review Expense"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Enter the expense details for your group outing."
              : step === 2
              ? "Add individual items and assign them to group members."
              : "Review your expense before submitting."}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-1 ${
                    step > s ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Expense Details */}
        {step === 1 && (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Expense Name</Label>
              <Input
                id="description"
                placeholder="e.g., Dinner at Italian Restaurant"
                value={expenseDetails.description}
                onChange={(e) =>
                  setExpenseDetails((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group">Group</Label>
              <Select
                value={expenseDetails.groupId}
                onValueChange={(value) =>
                  setExpenseDetails((prev) => ({ ...prev, groupId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={expenseDetails.category}
                  onValueChange={(value) =>
                    setExpenseDetails((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDetails.date}
                  onChange={(e) =>
                    setExpenseDetails((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Add Items */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* Current Item Form */}
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    placeholder="e.g., Pasta Carbonara"
                    value={currentItem.name}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="itemPrice">Price</Label>
                  <Input
                    id="itemPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentItem.price}
                    onChange={(e) =>
                      setCurrentItem((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Split between</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllMembers}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((member) => {
                    const isChecked = currentItem.allocatedTo.includes(member.id);
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-primary/10 border-primary"
                            : "bg-white hover:bg-gray-50"
                        }`}
                        onClick={() => toggleAllocation(member.id)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleAllocation(member.id)}
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(getMemberName(member))}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">
                          {getMemberName(member)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                type="button"
                onClick={addItem}
                disabled={
                  !currentItem.name ||
                  !currentItem.price ||
                  currentItem.allocatedTo.length === 0
                }
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="space-y-2">
                <Label>Added Items ({items.length})</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Split by {item.allocatedTo.length} people •{" "}
                          {formatCurrency(
                            parseFloat(item.price) / item.allocatedTo.length
                          )}
                          /person
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatCurrency(parseFloat(item.price))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>
            )}

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No items added yet</p>
                <p className="text-sm">Add items above to split the expense</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Expense Name</span>
                <span className="font-medium">{expenseDetails.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Group</span>
                <span className="font-medium">{selectedGroup?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="font-medium">
                  {categories.find((c) => c.id === expenseDetails.category)?.icon}{" "}
                  {categories.find((c) => c.id === expenseDetails.category)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-medium">
                  {new Date(expenseDetails.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-2">
              <Label>Items ({items.length})</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-gray-600">{item.name}</span>
                    <span>{formatCurrency(parseFloat(item.price))}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Share Breakdown */}
            <div className="space-y-2">
              <Label>Share Breakdown</Label>
              <div className="space-y-2">
                {members.map((member) => {
                  const share = calculateUserShare(member.id);
                  if (share === 0) return null;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 bg-white border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {getInitials(getMemberName(member))}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{getMemberName(member)}</span>
                      </div>
                      <Badge variant="secondary">
                        {formatCurrency(share)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          {step < 3 && (
            <Button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canProceedToStep2 : !canSubmit}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 3 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
            >
              {loading ? "Creating..." : "Create Expense"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddExpenseDialog;



