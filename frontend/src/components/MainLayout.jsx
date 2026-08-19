import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Header";
import Sidebar from "./Sidebar";

const MainLayout = () => {
  return (
    /* CHANGED: Added pt-16 to push your content down below the fixed navbar */
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-white text-gray-200 pt-16">
      <Navbar />

      {/* Added p-4 to create a margin around your layout cards */}
      <div className="mt-1 px-2 grid grid-cols-1 sm:grid-cols-[30%_70%] gap-2 grow items-start ">
        <Sidebar />
        {/* <main className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 min-h-[80vh]"> */}
        <main className="p-4 w-full max-sm:p-0 max-sm:mt-3 md:pe-1 ">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
