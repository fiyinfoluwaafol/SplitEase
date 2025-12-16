import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  UserPlus,
  ArrowLeft,
  Receipt,
  Users,
  Settings,
} from "lucide-react";
import { groupsAPI, expensesAPI, balancesAPI, categories, getCategoryById } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";

function GroupDetailPage() {
  const { user } = useUser();
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        const [groupRes, expensesRes, balancesRes] = await Promise.all([
          groupsAPI.getById(id),
          expensesAPI.getAll(id),
          balancesAPI.getByGroup(id),
        ]);
        setGroup(groupRes.group);
        setExpenses(expensesRes.expenses || []);
        setBalances(balancesRes.balances);
      } catch (error) {
        console.error("Error fetching group data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
  }, [id, user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500">Loading...</p>
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

  const memberUsers = (group.members || []).map((m) => m.user || m).filter(Boolean);
  const totalSpent = parseFloat(group.totalExpenses || 0);

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate balance per member from expenses
  const calculateMemberBalances = () => {
    const memberBalancesMap = {};
    memberUsers.forEach((member) => {
      memberBalancesMap[member.id] = { paid: 0, owes: 0 };
    });

    expenses.forEach((expense) => {
      const shareCount = expense.shares?.length || 1;
      const shareAmount = parseFloat(expense.amount) / shareCount;
      const paidById = typeof expense.paidBy === 'object' ? expense.paidBy.id : expense.paidBy;
      
      if (memberBalancesMap[paidById]) {
        memberBalancesMap[paidById].paid += parseFloat(expense.amount);
      }
      
      expense.shares?.forEach((share) => {
        const userId = share.userId || share.user?.id;
        if (memberBalancesMap[userId]) {
          memberBalancesMap[userId].owes += parseFloat(share.shareAmount || shareAmount);
        }
      });
    });

    return memberUsers.map((member) => ({
      ...member,
      paid: memberBalancesMap[member.id]?.paid || 0,
      owes: memberBalancesMap[member.id]?.owes || 0,
      balance: (memberBalancesMap[member.id]?.paid || 0) - (memberBalancesMap[member.id]?.owes || 0),
    }));
  };

  const memberBalances = calculateMemberBalances();

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;

    try {
      const memberIds = memberUsers.map((m) => m.id);
      await expensesAPI.create({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category || "other",
        groupId: parseInt(id),
        splitBetween: memberIds,
        splitType: "equal",
      });

      // Refresh expenses
      const expensesRes = await expensesAPI.getAll(id);
      setExpenses(expensesRes.expenses || []);
      
      setAddExpenseOpen(false);
      setNewExpense({ description: "", amount: "", category: "" });
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(error.message || "Failed to add expense");
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      await groupsAPI.addMember(id, inviteEmail);
      // Refresh group data
      const groupRes = await groupsAPI.getById(id);
      setGroup(groupRes.group);
      setInviteMemberOpen(false);
      setInviteEmail("");
    } catch (error) {
      console.error("Error inviting member:", error);
      alert(error.message || "Failed to invite member");
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/groups">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.description && (
              <p className="text-gray-500">{group.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Dialog open={inviteMemberOpen} onOpenChange={setInviteMemberOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Invite</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join this group via email.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="friend@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setInviteMemberOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={!inviteEmail}>
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Expense</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Expense</DialogTitle>
                  <DialogDescription>
                    Add a new expense to split with the group.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="What was this expense for?"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) =>
                        setNewExpense({ ...newExpense, category: value })
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
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddExpenseOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddExpense}
                    disabled={!newExpense.description || !newExpense.amount}
                  >
                    Add Expense
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{memberUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{expenses.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="w-4 h-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="w-4 h-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="balances" className="gap-2">
              <Settings className="w-4 h-4" />
              Balances
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Group Expenses</CardTitle>
                <CardDescription>
                  All expenses shared within this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                {expenses.length > 0 ? (
                  <div className="space-y-4">
                    {expenses.map((expense) => {
                      const payer = expense.payer || expense.paidBy;
                      const payerName = payer?.firstName 
                        ? `${payer.firstName} ${payer.lastName || ""}`.trim()
                        : payer?.name || "Unknown";
                      const category = getCategoryById(expense.category);
                      const shareCount = expense.shares?.length || 1;
                      return (
                        <div
                          key={expense.id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                            {category?.icon || "📦"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {expense.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payerName} paid • {formatDate(expense.date || expense.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatCurrency(parseFloat(expense.amount))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(parseFloat(expense.amount) / shareCount)}/person
                            </p>
                          </div>
                          {expense.settled ? (
                            <Badge variant="success">Settled</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No expenses yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setAddExpenseOpen(true)}
                    >
                      Add your first expense
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <CardTitle>Group Members</CardTitle>
                <CardDescription>
                  People in this expense group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberUsers.map((member) => {
                    const memberName = member.firstName 
                      ? `${member.firstName} ${member.lastName || ""}`.trim()
                      : member.name || "Unknown";
                    const memberId = member.id;
                    const isCurrentUser = user && memberId === parseInt(user.id);
                    return (
                      <div
                        key={memberId}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(memberName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {memberName}
                            {isCurrentUser && (
                              <span className="text-gray-500 ml-1">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Member Balances</CardTitle>
                <CardDescription>
                  Who owes what in this group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {memberBalances.map((member) => {
                    const memberName = member.firstName 
                      ? `${member.firstName} ${member.lastName || ""}`.trim()
                      : member.name || "Unknown";
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(memberName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {memberName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Paid {formatCurrency(member.paid)} • Owes{" "}
                            {formatCurrency(member.owes)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-semibold ${
                              member.balance >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {member.balance >= 0 ? "+" : ""}
                            {formatCurrency(member.balance)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {member.balance >= 0 ? "is owed" : "owes"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default GroupDetailPage;
