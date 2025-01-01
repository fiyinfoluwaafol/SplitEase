import { useState } from "react";
import "./UserAuthPage.css"
import LoginForm from "../../components/LoginForm/LoginForm";
import RegisterForm from "../../components/RegisterForm/RegisterForm";

// TODO: import logo and graphic for right half

function UserAuthPage () {
    const [isRegister, setIsRegister] = useState(true);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: ""
    })

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
        ...prevData,
        [name]: value,
        }));
    };

    return (
        <>
            <div id="entire-page-container">
                <div id="form-container">
                    <div id="logo-container">
                        <img src="/logo.jpeg" alt="logo" height={50} width={50} />
                        <h1>SplitEase</h1>
                    </div>
                    {/* Tab-Like Toggle with Smooth Transition */}
                    <div className="toggle-container" onClick={() => setIsRegister(!isRegister)}>
                        {/* Sliding Background */}
                        <div
                            className="toggle-slider"
                            style={{
                                transform: isRegister ? "translateX(0)" : "translateX(100%)",
                            }}
                        ></div>

                        {/* Buttons */}
                        <div className={`toggle-btn ${isRegister ? "active" : ""}`}>Register</div>
                        <div className={`toggle-btn ${!isRegister ? "active" : ""}`}>Login</div>
                    </div>
                  
                    {isRegister ? (
                        <RegisterForm 
                            formData={formData}
                            handleInputChange={handleInputChange}
                            passwordVisible={passwordVisible}
                            handlePasswordVisibilityToggle={() => setPasswordVisible(!passwordVisible)}
                        />) : (
                        <LoginForm 
                            email={formData.email}
                            password={formData.password}
                            handleInputChange={handleInputChange}
                            passwordVisible={passwordVisible}
                            handlePasswordVisibilityToggle={() => setPasswordVisible(!passwordVisible)}
                        />
                    )}
                </div>
                <div id="img-container">
                    <img src="/graphic.jpeg" height={350} width={350} alt="graphic of SplitEase"/>
                    <h3>Split the Costs, Ease the Process</h3>
                </div>
            </div>
        </>
    )
}

export default UserAuthPage;