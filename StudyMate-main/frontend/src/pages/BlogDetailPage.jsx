import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getBlogPost, authors, getRecentPosts } from '../utils/blogData';
import { formatDate } from '../utils/helpers';
import Footer from '../components/Global/Footer';

const BlogDetailPage = () => {
  const { id } = useParams();
  const post = getBlogPost(id);
  const recentPosts = getRecentPosts(3).filter(p => p.id !== post?.id);

  if (!post) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-4xl font-heading mb-4 text-white">404: Knowledge Not Found</h1>
          <Link to="/blog" className="text-cosmic-purple-light hover:underline">
            Back to the safe zone
          </Link>
        </div>
      </div>
    );
  }

  const author = authors[post.author];

  // New Robust Content Parser ---
  const renderContent = (content) => {
    // 1. Split content by newlines
    const lines = content.split('\n');

    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Handle Empty Lines (Spacers)
      if (!trimmedLine) {
        return <div key={index} className="h-6" />;
      }

      // Handle Headings (Lines starting with ##)
      if (trimmedLine.startsWith('## ')) {
        return (
          <h2 key={index} className="text-3xl font-heading mt-10 mb-6 text-white border-l-4 border-cosmic-purple pl-4">
            {trimmedLine.replace('## ', '')}
          </h2>
        );
      }

      // Handle Sub-headings or smaller sections (Lines starting with ###)
      if (trimmedLine.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-bold mt-8 mb-4 text-cosmic-neon">
            {trimmedLine.replace('### ', '')}
          </h3>
        );
      }

      // Handle Highlight Boxes (Lines that start AND end with **)
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && trimmedLine.length > 4) {
        return (
          <div key={index} className="my-8 p-6 bg-gradient-to-r from-cosmic-purple/10 to-transparent border border-cosmic-purple/30 rounded-xl relative overflow-hidden">
             {/* Decorative decorative accent */}
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-cosmic-purple" />
             <p className="text-lg font-medium text-white italic relative z-10">
                {trimmedLine.replace(/\*\*/g, '')}
             </p>
          </div>
        );
      }

      // Handle Bullet Points (Lines starting with -)
      if (trimmedLine.startsWith('- ')) {
        return (
          <div key={index} className="flex items-start mb-3 ml-4">
            <span className="text-cosmic-purple mr-3 mt-1.5 text-lg">•</span>
            <p className="text-gray-300 leading-relaxed flex-1">
               {/* Parse inline bolding within bullets */}
               {parseInlineFormat(trimmedLine.replace('- ', ''))}
            </p>
          </div>
        );
      }

      // Handle Normal Paragraphs
      return (
        <p key={index} className="mb-6 text-gray-300 text-lg leading-relaxed">
           {/* Parse inline bolding within paragraphs */}
           {parseInlineFormat(line)}
        </p>
      );
    });
  };

  // Helper to handle "This is **bold** text" inside a paragraph
  const parseInlineFormat = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-black text-gray-200">
      <article className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center text-gray-500 hover:text-cosmic-neon mb-12 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform mr-2">←</span> 
            <span>Back to all posts</span>
          </Link>

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 border-b border-white/10 pb-12"
          >
            <div className="flex flex-wrap items-center gap-3 text-sm text-cosmic-purple-light font-bold tracking-wider uppercase mb-6">
              <span className="bg-cosmic-purple/10 px-3 py-1 rounded-full border border-cosmic-purple/20">{post.category}</span>
              <span className="text-gray-700">•</span>
              <span>{post.readTime}</span>
              <span className="text-gray-700">•</span>
              <span>{formatDate(post.date)}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading mb-8 text-white leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 text-2xl">
                 {author.avatar}
              </div>
              <div>
                <p className="font-bold text-white text-lg">{post.author}</p>
                <p className="text-sm text-gray-500">{author.bio}</p>
              </div>
            </div>
          </motion.div>

          {/* Main Content Render */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="blog-content"
          >
            {renderContent(post.content)}
          </motion.div>

          {/* Recent Posts Section */}
          {recentPosts.length > 0 && (
            <div className="mt-24 pt-12 border-t border-white/10">
              <h2 className="text-3xl font-heading mb-10 text-white">More Good Reads</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentPosts.map((recentPost) => (
                  <Link
                    key={recentPost.id}
                    to={`/blog/${recentPost.id}`}
                    className="group bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-cosmic-purple/50 hover:bg-white/10 transition-all"
                  >
                    <span className="text-xs text-cosmic-purple-light font-bold uppercase tracking-wider mb-2 block">
                        {recentPost.category}
                    </span>
                    <h3 className="text-xl font-heading mb-3 text-white group-hover:text-cosmic-neon transition-colors">
                        {recentPost.title}
                    </h3>
                    <p className="text-sm text-gray-500">{formatDate(recentPost.date)}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
      <Footer />
    </div>
  );
};

export default BlogDetailPage;