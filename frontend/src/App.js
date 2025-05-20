import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import SignupForm from './components/SignupForm/SignupForm';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="App-nav">
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/signup">Create Account</Link>
            </li>
            {/* Add more navigation links as needed */}
          </ul>
        </nav>

        <main className="App-main">
          <Routes>
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/" element={
              <div className="App-home">
                <h1>Welcome to HSIT</h1>
                <p>Your trusted platform for crypto transactions</p>
                <div className="cta-buttons">
                  <Link to="/signup" className="cta-button">Create Account</Link>
                </div>
              </div>
            } />
            {/* Add more routes as needed */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
