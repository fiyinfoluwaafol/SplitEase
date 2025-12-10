import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Users, ArrowRight, Calendar } from "lucide-react";
import { groups, getUserById, getExpensesByGroup } from "@/data/mockData";

function GroupsPage() {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

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

  const handleCreateGroup = () => {
    console.log("Creating group:", { name: newGroupName, description: newGroupDescription });
    setCreateGroupOpen(false);
    setNewGroupName("");
    setNewGroupDescription("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            <p className="text-gray-500 mt-1">
              Manage your expense groups and members
            </p>
          </div>
          <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Group
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
                <div className="grid gap-2">
                  <Label htmlFor="groupDescription">Description (optional)</Label>
                  <Input
                    id="groupDescription"
                    placeholder="e.g., Monthly rent and utilities"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateGroupOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                  Create Group
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Groups Grid */}
        {groups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => {
              const memberUsers = group.members.map(getUserById).filter(Boolean);
              const groupExpenses = getExpensesByGroup(group.id);
              const totalSpent = groupExpenses.reduce((sum, e) => sum + e.amount, 0);

              return (
                <Link key={group.id} to={`/groups/${group.id}`}>
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <Badge variant="secondary">
                          {group.members.length} members
                        </Badge>
                      </div>
                      <CardTitle className="text-lg mt-3">{group.name}</CardTitle>
                      {group.description && (
                        <CardDescription className="line-clamp-2">
                          {group.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Members */}
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-2">
                            {memberUsers.slice(0, 4).map((member) => (
                              <Avatar
                                key={member.id}
                                className="h-8 w-8 border-2 border-white"
                              >
                                <AvatarFallback className="text-xs bg-gray-200">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {memberUsers.length > 4 && (
                              <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  +{memberUsers.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div>
                            <p className="text-xs text-gray-500">Total spent</p>
                            <p className="text-sm font-semibold">
                              {formatCurrency(totalSpent)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(group.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                No groups yet
              </h3>
              <p className="text-gray-500 text-center mb-4 max-w-sm">
                Create your first group to start splitting expenses with friends and family.
              </p>
              <Button onClick={() => setCreateGroupOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

export default GroupsPage;
