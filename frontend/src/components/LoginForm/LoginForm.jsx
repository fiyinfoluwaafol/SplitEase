import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./LoginForm.css";

function LoginForm ({ email, password, handleInputChange, passwordVisible, handlePasswordVisibilityToggle }) {
    const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
    const navigate = useNavigate();
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
                <button>Login</button>
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