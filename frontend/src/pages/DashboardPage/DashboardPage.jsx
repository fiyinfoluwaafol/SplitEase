import "./DashboardPage.css"
import { useNavigate } from 'react-router-dom';

function DashboardPage () {
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            const response = await fetch(`${backendUrlAccess}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",}, // Indicate JSON body
                credentials: "include",
                });
        //   setIsAuthenticated(false);
            navigate('/');
        } catch (error) {
          console.error('Error logging out:', error);
        }
      };
    return (
        <>
            Welcome to the Dashboard after logging in
            <button onClick={handleLogout}>Logout</button>
        </>
    )
}

export default DashboardPage;