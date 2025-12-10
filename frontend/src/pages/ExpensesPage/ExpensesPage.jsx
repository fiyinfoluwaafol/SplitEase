import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Receipt,
  Filter,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  expenses,
  groups,
  categories,
  getUserById,
  getGroupById,
  getCategoryById,
} from "@/data/mockData";
import { useUser } from "@/contexts/UserContext";

function ExpensesPage() {
  const { user } = useUser();
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    groupId: "",
  });

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

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesGroup = filterGroup === "all" || expense.groupId === filterGroup;
    const matchesCategory =
      filterCategory === "all" || expense.category === filterCategory;
    return matchesSearch && matchesGroup && matchesCategory;
  });

  // Separate by settled status
  const pendingExpenses = filteredExpenses.filter((e) => !e.settled);
  const settledExpenses = filteredExpenses.filter((e) => e.settled);

  // Calculate totals
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const yourShare = expenses.reduce((sum, e) => {
    if (user && e.splitBetween.includes(user.id)) {
      return sum + e.amount / e.splitBetween.length;
    }
    return sum;
  }, 0);

  const handleAddExpense = () => {
    console.log("Adding expense:", newExpense);
    setAddExpenseOpen(false);
    setNewExpense({ description: "", amount: "", category: "", groupId: "" });
  };

  const handleEditExpense = (expense) => {
    console.log("Editing expense:", expense);
  };

  const handleDeleteExpense = (expense) => {
    console.log("Deleting expense:", expense);
  };

  const ExpenseRow = ({ expense }) => {
    const payer = getUserById(expense.paidBy);
    const group = getGroupById(expense.groupId);
    const category = getCategoryById(expense.category);

    return (
      <div className="flex items-center gap-4 p-4 rounded-lg hover:bg-gray-50 border-b last:border-b-0">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg shrink-0">
          {category?.icon || "📦"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {expense.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">{payer?.name} paid</span>
            <span className="text-xs text-gray-300">•</span>
            <Link
              to={`/groups/${expense.groupId}`}
              className="text-xs text-primary hover:underline"
            >
              {group?.name}
            </Link>
            <span className="text-xs text-gray-300">•</span>
            <span className="text-xs text-gray-500">
              {formatDate(expense.date)}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold">{formatCurrency(expense.amount)}</p>
          <p className="text-xs text-gray-500">
            {formatCurrency(expense.amount / expense.splitBetween.length)}/person
          </p>
        </div>
        <div className="shrink-0">
          {expense.settled ? (
            <Badge variant="success">Settled</Badge>
          ) : user && expense.paidBy === user.id ? (
            <Badge variant="default">You paid</Badge>
          ) : (
            <Badge variant="secondary">
              You owe {formatCurrency(expense.amount / expense.splitBetween.length)}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDeleteExpense(expense)}
              className="text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
            <p className="text-gray-500 mt-1">
              Track and manage all your shared expenses
            </p>
          </div>
          <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>
                  Add an expense to split with your group.
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
                  <Label htmlFor="group">Group</Label>
                  <Select
                    value={newExpense.groupId}
                    onValueChange={(value) =>
                      setNewExpense({ ...newExpense, groupId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  disabled={
                    !newExpense.description ||
                    !newExpense.amount ||
                    !newExpense.groupId
                  }
                >
                  Add Expense
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Your Share
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(yourShare)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingExpenses.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Settled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{settledExpenses.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="settled">
              Settled ({settledExpenses.length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({filteredExpenses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardContent className="p-0">
                {pendingExpenses.length > 0 ? (
                  <div>
                    {pendingExpenses.map((expense) => (
                      <ExpenseRow key={expense.id} expense={expense} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pending expenses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settled">
            <Card>
              <CardContent className="p-0">
                {settledExpenses.length > 0 ? (
                  <div>
                    {settledExpenses.map((expense) => (
                      <ExpenseRow key={expense.id} expense={expense} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No settled expenses</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardContent className="p-0">
                {filteredExpenses.length > 0 ? (
                  <div>
                    {filteredExpenses.map((expense) => (
                      <ExpenseRow key={expense.id} expense={expense} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No expenses found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

export default ExpensesPage;
