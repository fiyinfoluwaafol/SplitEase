import "./UserAuthPage.css"
// TODO: import LoginForm component
import RegisterForm from "../../components/RegisterForm/RegisterForm";

// TODO: import logo and graphic for right half

function UserAuthPage () {
    return (
        <>
            <div id="entire-page-container">
                <div id="form-container">
                    <div>
                        <img alt="logo"/>
                        <h1>SplitEase</h1>
                    </div>
                    <div>
                        <button>Register or Login Toggle Button</button>
                    </div>
                    <RegisterForm />
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