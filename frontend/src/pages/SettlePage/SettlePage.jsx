import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  ArrowLeftRight,
  Check,
  Clock,
  DollarSign,
  History,
} from "lucide-react";
import { balancesAPI, paymentsAPI } from "@/lib/api";
import { useUser } from "@/contexts/UserContext";

function SettlePage() {
  const { user } = useUser();
  const [settleOpen, setSettleOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [balances, setBalances] = useState({ youOwe: 0, youAreOwed: 0, totalBalance: 0 });
  const [detailedBalances, setDetailedBalances] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const [balancesRes, paymentsRes] = await Promise.all([
          balancesAPI.getOverall(),
          paymentsAPI.getAll(),
        ]);
        setBalances(balancesRes.balances || { youOwe: 0, youAreOwed: 0, totalBalance: 0 });
        setDetailedBalances(balancesRes.balances?.detailed || []);
        setPayments(paymentsRes.payments || []);
      } catch (error) {
        console.error("Error fetching settle data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleOpenSettle = (balance) => {
    setSelectedBalance(balance);
    setPaymentAmount(Math.abs(balance.amount).toFixed(2));
    setPaymentNote("");
    setSettleOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedBalance || !paymentAmount) return;

    try {
      const toUserId = selectedBalance.user?.id || selectedBalance.userId;
      await paymentsAPI.create({
        toUserId: parseInt(toUserId),
        amount: parseFloat(paymentAmount),
        note: paymentNote || undefined,
      });

      // Refresh data
      const [balancesRes, paymentsRes] = await Promise.all([
        balancesAPI.getOverall(),
        paymentsAPI.getAll(),
      ]);
      setBalances(balancesRes.balances || { youOwe: 0, youAreOwed: 0, totalBalance: 0 });
      setDetailedBalances(balancesRes.balances?.detailed || []);
      setPayments(paymentsRes.payments || []);

      setSettleOpen(false);
      setSelectedBalance(null);
      setPaymentAmount("");
      setPaymentNote("");
    } catch (error) {
      console.error("Error recording payment:", error);
      alert(error.message || "Failed to record payment");
    }
  };

  // Separate who you owe vs who owes you
  const youOwe = detailedBalances.filter((b) => b.type === "owes");
  const owedToYou = detailedBalances.filter((b) => b.type === "owed");

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settle Up</h1>
          <p className="text-gray-500 mt-1">
            View balances and record payments between friends
          </p>
        </div>

        {/* Balance Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  balances.totalBalance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {balances.totalBalance >= 0 ? "+" : "-"}
                {formatCurrency(balances.totalBalance)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {balances.totalBalance >= 0
                  ? "Overall, you're owed money"
                  : "Overall, you owe money"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                You Owe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(balances.youOwe)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                To {youOwe.length} {youOwe.length === 1 ? "person" : "people"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                You Are Owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(balances.youAreOwed)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                From {owedToYou.length}{" "}
                {owedToYou.length === 1 ? "person" : "people"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="balances" className="space-y-4">
          <TabsList>
            <TabsTrigger value="balances" className="gap-2">
              <ArrowLeftRight className="w-4 h-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Payment History
            </TabsTrigger>
          </TabsList>

          {/* Balances Tab */}
          <TabsContent value="balances" className="space-y-6">
            {/* You Owe Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  You Owe
                </CardTitle>
                <CardDescription>
                  People you need to pay back
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : youOwe.length > 0 ? (
                  <div className="space-y-3">
                    {youOwe.map((balance) => {
                      const balanceUser = balance.user;
                      const userName = balanceUser?.firstName 
                        ? `${balanceUser.firstName} ${balanceUser.lastName || ""}`.trim()
                        : balanceUser?.name || "Unknown";
                      return (
                        <div
                          key={balanceUser?.id || balance.userId}
                          className="flex items-center gap-4 p-4 rounded-lg bg-red-50 border border-red-100"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-red-100 text-red-700">
                              {getInitials(userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {userName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {balanceUser?.email || ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              {formatCurrency(Math.abs(balance.amount))}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleOpenSettle(balance)}
                            className="shrink-0"
                          >
                            Settle Up
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500">You don't owe anyone!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owed to You Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Owed to You
                </CardTitle>
                <CardDescription>
                  People who owe you money
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : owedToYou.length > 0 ? (
                  <div className="space-y-3">
                    {owedToYou.map((balance) => {
                      const balanceUser = balance.user;
                      const userName = balanceUser?.firstName 
                        ? `${balanceUser.firstName} ${balanceUser.lastName || ""}`.trim()
                        : balanceUser?.name || "Unknown";
                      return (
                        <div
                          key={balanceUser?.id || balance.userId}
                          className="flex items-center gap-4 p-4 rounded-lg bg-green-50 border border-green-100"
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-green-100 text-green-700">
                              {getInitials(userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {userName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {balanceUser?.email || ""}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              {formatCurrency(balance.amount)}
                            </p>
                          </div>
                          <Button variant="outline" className="shrink-0">
                            Remind
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No one owes you money</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Record of all payments made
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.map((payment) => {
                      const from = payment.from || payment.fromUserId;
                      const to = payment.to || payment.toUserId;
                      const fromName = from?.firstName 
                        ? `${from.firstName} ${from.lastName || ""}`.trim()
                        : from?.name || "Unknown";
                      const toName = to?.firstName 
                        ? `${to.firstName} ${to.lastName || ""}`.trim()
                        : to?.name || "Unknown";
                      const fromId = typeof from === 'object' ? from.id : from;
                      const toId = typeof to === 'object' ? to.id : to;
                      const isFromCurrentUser = user && fromId === parseInt(user.id);
                      const isToCurrentUser = user && toId === parseInt(user.id);

                      return (
                        <div
                          key={payment.id}
                          className="flex items-center gap-4 p-4 rounded-lg border"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">
                                {getInitials(fromName)}
                              </AvatarFallback>
                            </Avatar>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">
                                {getInitials(toName)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {isFromCurrentUser ? "You" : fromName} paid{" "}
                              {isToCurrentUser ? "you" : toName}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {payment.note && (
                                <>
                                  <span className="text-xs text-gray-500">
                                    {payment.note}
                                  </span>
                                  <span className="text-xs text-gray-300">•</span>
                                </>
                              )}
                              {payment.group && (
                                <>
                                  <span className="text-xs text-gray-500">
                                    {payment.group.name}
                                  </span>
                                  <span className="text-xs text-gray-300">•</span>
                                </>
                              )}
                              <span className="text-xs text-gray-500">
                                {formatDate(payment.date || payment.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-sm font-semibold ${
                                isFromCurrentUser
                                  ? "text-red-600"
                                  : "text-green-600"
                              }`}
                            >
                              {isFromCurrentUser ? "-" : "+"}
                              {formatCurrency(parseFloat(payment.amount))}
                            </p>
                          </div>
                          <Badge variant="success">
                            <Check className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No payment history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Settle Up Dialog */}
        <Dialog open={settleOpen} onOpenChange={setSettleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment to {selectedBalance?.user?.firstName 
                  ? `${selectedBalance.user.firstName} ${selectedBalance.user.lastName || ""}`.trim()
                  : selectedBalance?.user?.name || "this person"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <ArrowRight className="w-5 h-5 text-gray-400" />
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedBalance?.user && getInitials(
                      selectedBalance.user.firstName 
                        ? `${selectedBalance.user.firstName} ${selectedBalance.user.lastName || ""}`.trim()
                        : selectedBalance.user.name || "Unknown"
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    You → {selectedBalance?.user?.firstName 
                      ? `${selectedBalance.user.firstName} ${selectedBalance.user.lastName || ""}`.trim()
                      : selectedBalance?.user?.name || "Unknown"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Total owed: {selectedBalance && formatCurrency(Math.abs(selectedBalance.amount))}
                  </p>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="What's this payment for?"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettleOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={!paymentAmount}>
                Record Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

export default SettlePage;
