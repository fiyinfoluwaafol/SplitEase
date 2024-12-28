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
                    <div>
                        <img alt="logo"/>
                        <h1>SplitEase</h1>
                    </div>
                    <div>
                        <button onClick={() => setIsRegister(!isRegister)}>Register or Login Toggle Button</button>
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
                    <img alt="graphic of SplitEase"/>
                    <h3>Graphic with Catchy Tagline</h3>
                </div>
            </div>
        </>
    )
}

export default UserAuthPage;