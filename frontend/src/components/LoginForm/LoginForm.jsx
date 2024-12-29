import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./LoginForm.css";

function LoginForm ({ email, password, handleInputChange, passwordVisible, handlePasswordVisibilityToggle }) {
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();

    async function handleLogin (userObj) {
        try {
            const response = await fetch(`${backendUrlAccess}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", // Indicate JSON body
                },
                body: JSON.stringify(userObj), // Send email and password in the body
                credentials: "include", // Include cookies in the request
            });

            if (response.ok) {
                // If login is successful, navigate to the dashboard
                navigate("/dashboard");
            } else {
                // Handle errors returned by the server
                const errorData = await response.json();
                alert('Signup failed: ' + errorData);
                // setErrorMessage(errorData.message || "Login failed. Please try again.");
            }
        } catch (error) {
            console.error("Error during login:", error);
            // setErrorMessage("An unexpected error occurred. Please try again later.");
        }
    };

    const handleOnSubmit = async (event) => {
        event.preventDefault();
        // TODO: Add email validation and password validation
        const userObj = { email, password };
        handleLogin(userObj);
    }
    return (
        <div>
            <form>
                <p>Email Address</p>
                <input
                    name="email"
                    type="email"
                    placeholder="johndoe@email.com"
                    value={email}
                    onChange={handleInputChange}
                />

                <p>Password</p>
                <div className="password-div">
                    <input
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        value={password}
                        onChange={handleInputChange}
                    />
                    <p id="show-hide-bttn" onClick={handlePasswordVisibilityToggle}>
                        {passwordVisible ? 'Hide' : 'Show'}
                    </p>
                </div>
                <button onClick={(e) => handleOnSubmit(e)}>Login</button>
            </form>

            <p>Or Continue With</p>
            <div id="social-icons">
                <button>Google</button>
                <button>Apple</button>
                <button>Microsoft</button>
            </div>
        </div>
    )
}

export default LoginForm;