import { Footer } from "@/components/footer";
import Navbar from "@/components/navbar";
 import { ToastContainer } from 'react-toastify';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (<>
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 w-full flex flex-col gap-20">
        {children}
      </div>
    </main>
    <ToastContainer />
  </>);
}
