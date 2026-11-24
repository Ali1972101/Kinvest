import React from "react";
import Home from "./Pages/Home";
import HomeProfile from "./Pages/HomeProfile";
import Statistics from "./Pages/Statistics";
import Cards from "./Pages/Cards";
import AddCards from "./Pages/AddCards";
import TransactionHistory from "./Pages/TransactionHistory";
import Search from "./Pages/Search";
import Settings from "./Pages/Settings";
import Profile from "./Pages/Profile";
import EditProfile from "./Pages/EditProfile";
import ChangePassword from "./Pages/ChangePassword";
import Terms from "./Pages/Terms";
import ContactUs from "./Pages/ContactUs";
import OpenAccount from "./Pages/OpenAccount";
import Signup from "./Pages/Signup";
import ServiceAgreement from "./Components/ServiceAgreement";
import Send from "./Pages/Send";
import Receive from "./Pages/Receive";
import { BrowserRouter, Route, Routes } from "react-router";
import Loan from "./Pages/Loan";
import TopUp from "./Pages/TopUp";
import Admin from "./Pages/Admin";
import Business from "./Pages/Business";
import Loans from "./Pages/Loans";
import LoanApply from "./Pages/LoanApply";
import Recover from "./Pages/Recover";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/homeprofile" element={<HomeProfile />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/my-cards" element={<Cards />} />
        <Route path="/my-cards/add" element={<AddCards />} />
        <Route path="/send" element={<Send />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/transactions" element={<TransactionHistory />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/password" element={<ChangePassword />} />
        <Route path="/settings/privacy" element={<Terms />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/personal" element={<EditProfile />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/service-agreement" element={<ServiceAgreement />} />
        <Route path="/open-account" element={<OpenAccount />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/loan" element={<Loan />} />
        <Route path="/top-up" element={<TopUp />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/business" element={<Business />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/apply" element={<LoanApply />} />
        <Route path="/recover" element={<Recover />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
