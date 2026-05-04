import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { blogPosts, authors } from '../utils/blogData';
import { formatDate } from '../utils/helpers';

const BlogPage = () => {
  const sortedPosts = [...blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black to-cosmic-blue/10">
      <div className="max-w-4xl mx-auto">
        
        {}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl md:text-7xl mb-6 font-heading bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            The Knowledge Drop
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light">
            Less boring than your textbooks, more useful than a fortune cookie. 
            Strategies to hack your brain and survive the semester.
          </p>
        </motion.div>

        {/* Blog List - One per row */}
        <div className="space-y-12">
          {sortedPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:border-cosmic-purple/40 transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              <div className="p-8 md:p-10">
                <div className="flex flex-wrap items-center gap-3 text-sm text-cosmic-purple-light mb-4 font-medium tracking-wider uppercase">
                  <span>{post.category}</span>
                  <span className="text-gray-600">•</span>
                  <span>{post.readTime}</span>
                </div>

                <h2 className="text-3xl md:text-4xl font-heading mb-4 text-white group-hover:text-cosmic-neon transition-colors">
                  <Link to={`/blog/${post.id}`}>
                    {post.title}
                  </Link>
                </h2>

                <p className="text-gray-400 text-lg mb-8 leading-relaxed line-clamp-3">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-cosmic-purple/20 flex items-center justify-center border border-cosmic-purple/30 text-lg">
                      {authors[post.author]?.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{post.author}</p>
                      <p className="text-xs text-gray-500">{formatDate(post.date)}</p>
                    </div>
                  </div>
                  
                  <Link
                    to={`/blog/${post.id}`}
                    className="inline-flex items-center text-white hover:text-cosmic-neon transition-colors font-medium group-hover:translate-x-2 duration-300"
                  >
                    Read Article <span className="ml-2">→</span>
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlogPage;