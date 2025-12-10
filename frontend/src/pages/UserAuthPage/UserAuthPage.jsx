import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/LoginForm/LoginForm";
import RegisterForm from "@/components/RegisterForm/RegisterForm";

function UserAuthPage() {
  const [activeTab, setActiveTab] = useState("register");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">SE</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SplitEase</h1>
          </div>

          {/* Auth Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl text-center">
                {activeTab === "register" ? "Create an account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-center">
                {activeTab === "register"
                  ? "Enter your details to get started"
                  : "Enter your credentials to access your account"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value);
                  resetForm();
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="register">Register</TabsTrigger>
                  <TabsTrigger value="login">Login</TabsTrigger>
                </TabsList>

                <TabsContent value="register" className="mt-0">
                  <RegisterForm
                    formData={formData}
                    handleInputChange={handleInputChange}
                  />
                </TabsContent>

                <TabsContent value="login" className="mt-0">
                  <LoginForm
                    email={formData.email}
                    password={formData.password}
                    handleInputChange={handleInputChange}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="text-primary hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-primary hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Graphic Section */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 items-center justify-center p-12">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <img
              src="/graphic.jpeg"
              alt="SplitEase illustration"
              className="w-80 h-80 mx-auto rounded-2xl shadow-xl object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Split the Costs, Ease the Process
          </h2>
          <p className="text-gray-600">
            Manage shared expenses effortlessly with friends, family, and roommates. 
            Track who owes what and settle up with ease.
          </p>
        </div>
      </div>
    </div>
  );
}

export default UserAuthPage;
