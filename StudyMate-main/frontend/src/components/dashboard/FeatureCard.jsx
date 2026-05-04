import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon, title, description, to, color }) => {
    const colorClasses = {
        'cosmic-purple': 'from-cosmic-purple/20 to-cosmic-purple/5 border-cosmic-purple/30 hover:border-cosmic-purple/50 hover:shadow-cosmic-purple/20',
        'cyan-500': 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 hover:border-cyan-500/50 hover:shadow-cyan-500/20',
        'pink-500': 'from-pink-500/20 to-pink-500/5 border-pink-500/30 hover:border-pink-500/50 hover:shadow-pink-500/20',
        'emerald-500': 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/20',
    };

    return (
        <Link to={to}>
            <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={`relative p-4 md:p-6 rounded-xl md:rounded-2xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm cursor-pointer transition-all duration-300 hover:shadow-lg group h-full`}
            >
                <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                    <div className="text-3xl md:text-4xl lg:text-5xl mb-1 md:mb-2 group-hover:scale-110 transition-transform duration-300">
                        {icon}
                    </div>
                    <h3 className="text-base md:text-lg lg:text-xl font-heading font-bold">
                        {title}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                        {description}
                    </p>
                </div>

                {}
                <div className="absolute bottom-3 md:bottom-4 right-3 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs md:text-sm text-gray-400">→</span>
                </div>
            </motion.div>
        </Link>
    );
};

export default FeatureCard;
