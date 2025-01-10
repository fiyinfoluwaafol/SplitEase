import "./DashboardPage.css"
import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';

function DashboardPage () {
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();

    // Check if the user is authenticated when the component mounts
    useEffect(() => {
        const checkAuth = async () => {
        try {
            const response = await fetch(`${backendUrlAccess}/auth/acct-access`, {
            method: "GET",
            credentials: "include", // Include cookies with the request
            });

            if (!response.ok) {
            // If not authenticated, redirect to the base route
            navigate("/");
            }
        } catch (error) {
            console.error("Error checking authentication:", error);
            navigate("/"); // Redirect to the login page if an error occurs
        }
        };

        checkAuth();
    }, [backendUrlAccess, navigate]);

    const handleLogout = async () => {
        try {
            const response = await fetch(`${backendUrlAccess}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",}, // Indicate JSON body
                credentials: "include",
                });

            if (response.ok) {
                navigate("/"); // Redirect to login page after successful logout
            } else {
                console.error("Logout failed.");
            }
        } catch (error) {
          console.error('Error logging out:', error);
        }
      };
    return (
        <div>
            <h1>Welcome to the Dashboard after logging in</h1>
            <button onClick={handleLogout}>Logout</button>
        </div>
    )
}

export default DashboardPage;