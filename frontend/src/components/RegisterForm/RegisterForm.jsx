import { useState } from "react";
import "./RegisterForm.css";

function RegisterForm ({ formData, handleInputChange }) {

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
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                    />
                    <p id="show-hide-bttn">Show</p>
                </div>
                <button>Register</button>
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