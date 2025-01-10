import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./RegisterForm.css";

function RegisterForm ({ formData, handleInputChange, passwordVisible, handlePasswordVisibilityToggle }) {
    const [errorMessage, setErrorMessage] = useState();
    const [globalErrorMsg, setGlobalErrorMsg] = useState();
    const [passwordRules, setPasswordRules] = useState([
        { message: '8 characters', valid: false },
        { message: '1 uppercase letter', valid: false },
        { message: '1 lowercase letter', valid: false },
        { message: '1 number', valid: false },
        { message: '1 special character (e.g., !, @, #, etc.)', valid: false },
    ]);
    const [showPasswordRules, setShowPasswordRules] = useState(false);
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const validatePassword = (password) => {
        const updatedRules = [
            { message: '8 characters', valid: password.length >= 8 },
            { message: '1 uppercase letter', valid: /[A-Z]/.test(password) },
            { message: '1 lowercase letter', valid: /[a-z]/.test(password) },
            { message: '1 number', valid: /[0-9]/.test(password) },
            { message: '1 special character (e.g., !, @, #, etc.)', valid: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
        ];
        setPasswordRules(updatedRules);
    };
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
                alert('Login failed: ' + errorData.error);
                // setErrorMessage(errorData.message || "Login failed. Please try again.");
            }
        } catch (error) {
            console.error("Error during login:", error);
            // setErrorMessage("An unexpected error occurred. Please try again later.");
        }
    };

    async function handleRegister (userObj) {
        try {
            const response = await fetch(`${backendUrlAccess}/auth/registration`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(userObj),
                credentials: 'include'
              });
            if (response.ok) {
            const data = await response.json();
    
            // Update the user context
            // updateUser(data.user);
    
            handleLogin(userObj);
            } else {
                // Handle signup failure case
                const errorData = await response.json()
                setGlobalErrorMsg("Signup failed: " + errorData.error);
            }
        } catch (error) {
            alert('Signup failed: ' + error);
        }
    }

    const handleBlur = () => {
        // Checks if email field is empty
        if (!formData.email) {
            setErrorMessage('');
        } else if (!emailRegex.test(formData.email)) {
            setErrorMessage('Invalid email format');
        } else {
            setErrorMessage('');
        }
    }
    const handleOnSubmit = async (event) => {
        event.preventDefault();
        const userObj = formData;
        handleRegister(userObj);
    }
    return (
        <div>
            <form>
                <div id="name-container">
                    <div>
                        <p>First Name</p>
                        <input
                            name="firstName"
                            type="text"
                            value={formData.firstName}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <p>Last Name</p>
                        <input
                            name="lastName"   
                            type="text"
                            value={formData.lastName}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <p>Email Address</p>
                <input
                    name="email"
                    type="email"
                    placeholder="johndoe@email.com"
                    autoComplete="email"
                    value={formData.email}
                    onBlur={handleBlur}
                    onChange={handleInputChange}
                />
                {errorMessage && <p className="error-msg">{errorMessage}</p>}

                <p>Password</p>
                <div className="password-div">
                    <input
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        value={formData.password}
                        onChange={
                            (e) => {
                                handleInputChange(e); // Update formData
                                validatePassword(e.target.value); // Validate password
                            }}
                        onFocus={() => setShowPasswordRules(true)}
                        onBlur={() => setShowPasswordRules(false)}
                    />
                    <p id="show-hide-bttn" onClick={handlePasswordVisibilityToggle}>
                        {passwordVisible ? 'Hide' : 'Show'}
                    </p>
                </div>
                {showPasswordRules && <div>
                    <p>Password must contain at least:</p>
                    <ul className="password-rules">
                        {passwordRules.map((rule, index) => (
                            <li key={index} className={rule.valid ? 'valid' : 'invalid'}>
                                {rule.message}
                            </li>
                        ))}
                    </ul>
                </div>}
                {globalErrorMsg && <div className="error-msg">
                    {globalErrorMsg}
                </div>}
                <button onClick={(e) => handleOnSubmit(e)} disabled={!!errorMessage}>Register</button>
            </form>

            <p>Or Continue With</p>
            <div id="social-icons">
                <button>Google</button>
                {/* <button>Apple</button> */}
                <button>Microsoft</button>
            </div>
        </div>
    )
}

export default RegisterForm;