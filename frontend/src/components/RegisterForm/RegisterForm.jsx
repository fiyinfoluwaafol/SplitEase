import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./RegisterForm.css";

function RegisterForm ({ formData, handleInputChange, passwordVisible, handlePasswordVisibilityToggle }) {
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();
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
    
            // Reset form fields
            // setFirstName('');
            // setLastName('');
            // setEmail('');
            // setPassword('');
    
            // Update the user context
            // updateUser(data.user);
    
            // Navigate to the DashboardPage after successful login
            navigate('/dashboard');
            } else {
                // Handle signup failure case
                alert('Signup failed');
            }
        } catch (error) {
            alert('Signup failed: ' + error);
        }
    }

    const handleOnSubmit = async (event) => {
        event.preventDefault();
        // TODO: Add email validation and password validation
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
                    value={formData.email}
                    onChange={handleInputChange}
                />

                <p>Password</p>
                <div className="password-div">
                    <input
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                    />
                    <p id="show-hide-bttn" onClick={handlePasswordVisibilityToggle}>
                        {passwordVisible ? 'Hide' : 'Show'}
                    </p>
                </div>
                <button onClick={(e) => handleOnSubmit(e)}>Register</button>
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

export default RegisterForm;