import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  Receipt,
  ArrowRight,
} from "lucide-react";
import {
  groups,
  calculateBalances,
  getRecentActivity,
  getUserById,
  getCategoryById,
  currentUser,
} from "@/data/mockData";

function DashboardPage() {
  const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
  const navigate = useNavigate();
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const balances = calculateBalances();
  const recentActivity = getRecentActivity(5);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${backendUrlAccess}/auth/acct-access`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        navigate("/");
      }
    };

    checkAuth();
  }, [backendUrlAccess, navigate]);

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
    });
  };

  const handleCreateGroup = () => {
    // Mock creating a group
    console.log("Creating group:", newGroupName);
    setCreateGroupOpen(false);
    setNewGroupName("");
    // In real app, this would call an API
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {currentUser.name.split(" ")[0]}!
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Users className="w-4 h-4" />
                  New Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Create a group to start splitting expenses with friends.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      placeholder="e.g., Apartment Expenses"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateGroupOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateGroup}>Create Group</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button className="gap-2" asChild>
              <Link to="/expenses">
                <Plus className="w-4 h-4" />
                Add Expense
              </Link>
            </Button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Balance
              </CardTitle>
              <Wallet className="w-4 h-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  balances.totalBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {balances.totalBalance >= 0 ? "+" : ""}
                {formatCurrency(balances.totalBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {balances.totalBalance >= 0
                  ? "You're owed overall"
                  : "You owe overall"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                You Owe
              </CardTitle>
              <TrendingDown className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(balances.youOwe)}
              </div>
              <p className="text-xs text-gray-500 mt-1">To other members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                You Are Owed
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(balances.youAreOwed)}
              </div>
              <p className="text-xs text-gray-500 mt-1">From other members</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/expenses" className="gap-1">
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => {
                    if (activity.type === "expense") {
                      const expense = activity.data;
                      const payer = getUserById(expense.paidBy);
                      const category = getCategoryById(expense.category);
                      return (
                        <div
                          key={`exp-${index}`}
                          className="flex items-center gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                            {category?.icon || "📦"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {expense.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payer?.name} paid • {formatDate(expense.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(expense.amount)}
                            </p>
                            {expense.paidBy === currentUser.id ? (
                              <Badge variant="success" className="text-xs">
                                You paid
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {payer?.name.split(" ")[0]} paid
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const payment = activity.data;
                      const from = getUserById(payment.from);
                      const to = getUserById(payment.to);
                      return (
                        <div
                          key={`pay-${index}`}
                          className="flex items-center gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {from?.name} paid {to?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {payment.note} • {formatDate(payment.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrency(payment.amount)}
                            </p>
                            <Badge variant="success" className="text-xs">
                              Payment
                            </Badge>
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Groups */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Your Groups</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/groups" className="gap-1">
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <div className="space-y-4">
                  {groups.slice(0, 4).map((group) => {
                    const memberUsers = group.members
                      .map(getUserById)
                      .filter(Boolean);
                    return (
                      <Link
                        key={group.id}
                        to={`/groups/${group.id}`}
                        className="flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {group.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {group.members.length} members
                          </p>
                        </div>
                        <div className="flex -space-x-2">
                          {memberUsers.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              className="h-7 w-7 border-2 border-white"
                            >
                              <AvatarFallback className="text-xs bg-gray-200">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {memberUsers.length > 3 && (
                            <div className="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                +{memberUsers.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">No groups yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateGroupOpen(true)}
                  >
                    Create your first group
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default DashboardPage;
