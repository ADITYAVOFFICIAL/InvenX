"use client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  // Define animation variants for the button
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 px-4"
    >
      <h1 className="text-5xl font-bold text-gray-800 mb-4">404 - Page Not Found</h1>
      <p className="text-lg text-center text-gray-600 mb-8">
        We're sorry, the page you requested could not be found.
      </p>
      <Link href="/" passHref>
        <motion.a
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="px-6 py-3 bg-blue-600 text-white rounded-md"
        >
          Go Back Home
        </motion.a>
      </Link>
    </motion.div>
  );
}
