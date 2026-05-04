import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { APP_NAME } from '../../utils/constants';

const Footer = () => {
  return (
    <footer className="bg-cosmic-darker border-t border-cosmic-purple/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-gradient mb-4">✨ {APP_NAME}</h3>
            <p className="text-gray-400 max-w-md">
              AI-powered study platform designed to help students learn smarter, stay organized, and improve academic performance.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <a href="#features" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Features
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-cosmic-purple-light transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-cosmic-purple/20 text-center text-gray-400">
          <p>&copy; 2024 {APP_NAME}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

