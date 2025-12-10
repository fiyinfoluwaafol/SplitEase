import "./DashboardPage.css";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function DashboardPage() {
  const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
  const navigate = useNavigate();

  // Check if the user is authenticated when the component mounts
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${backendUrlAccess}/auth/acct-access`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        navigate("/");
      }
    };

    checkAuth();
  }, [backendUrlAccess, navigate]);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${backendUrlAccess}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        navigate("/");
      } else {
        console.error("Logout failed.");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo">
          <h1>SplitEase</h1>
        </div>
        <div className="header-actions">
          <span className="user-greeting">Welcome back!</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Balance Summary Cards */}
        <section className="balance-section">
          <div className="balance-card total">
            <span className="balance-label">Total Balance</span>
            <span className="balance-amount">$0.00</span>
          </div>
          <div className="balance-card owe">
            <span className="balance-label">You Owe</span>
            <span className="balance-amount negative">$0.00</span>
          </div>
          <div className="balance-card owed">
            <span className="balance-label">You Are Owed</span>
            <span className="balance-amount positive">$0.00</span>
          </div>
        </section>

        {/* Content Grid */}
        <section className="content-grid">
          {/* Groups Section */}
          <div className="content-card groups-card">
            <div className="card-header">
              <h2>My Groups</h2>
            </div>
            <div className="card-content empty-state">
              <div className="empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <p className="empty-text">No groups yet</p>
              <p className="empty-subtext">
                Create a group to start splitting expenses with friends
              </p>
              <button className="primary-btn">Create Group</button>
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="content-card activity-card">
            <div className="card-header">
              <h2>Recent Activity</h2>
            </div>
            <div className="card-content empty-state">
              <div className="empty-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <p className="empty-text">No recent activity</p>
              <p className="empty-subtext">
                Your expenses and payments will appear here
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DashboardPage;
