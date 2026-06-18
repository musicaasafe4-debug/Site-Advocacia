import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import LoadingScreen from '../components/LoadingScreen'; // ← IMPORT ADICIONADO!
import { loadContent } from "/src/utils/contentLoader";
import { createArticleExcerpt } from "/src/utils/articleFormatting";
import '../styles/animations.css';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [content, setContent] = useState({
    siteName: "Edson Silva Maltez",
    oab: "OAB/SP 344.956",
    whatsapp: "5519996319810",
    phone: "(19) 99631-9810",
    email: "dredsonmaltez@gmail.com",
    address: "Rua Francisco Biancalana, 31 - sala 02 - Vila Santana, Sumaré - SP"
  });

  useEffect(() => {
    async function loadData() {
      try {
        const settingsData = await loadContent('/src/content/settings/general.md');
        setContent(prev => ({ ...prev, ...settingsData?.data }));

        const repo = 'oseiasoliveirasilva828-afk/Site-Advocacia';
        const branch = 'main';
        const path = 'public/content/posts';

        const githubRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`);
        const files = await githubRes.json();

        const slugs = files
          .filter(f => f.name.endsWith('.md'))
          .map(f => f.name.replace('.md', ''));

        const postsData = [];
        for (const slug of slugs) {
          const res = await fetch(`/content/posts/${slug}.md`);
          if (res.ok) {
            const text = await res.text();
            const { data, content } = parseFrontmatter(text);
            postsData.push({
              slug,
              data,
              content: createArticleExcerpt(content)
            });
          }
        }

        postsData.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
        setPosts(postsData);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function parseFrontmatter(text) {
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { data: {}, content: text };
    const data = {};
    match[1].split('\n').forEach(line => {
      if (line.includes(': ')) {
        const [key, ...value] = line.split(': ');
        data[key.trim()] = value.join(': ').trim();
      }
    });
    return { data, content: match[2] };
  }

  const filteredPosts = posts.filter(p =>
    p.data.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.data.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="font-sans overflow-x-hidden">
      <Header siteName={content.siteName} oab={content.oab} whatsapp={content.whatsapp} />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-secondary text-white pt-37 pb-25 md:pb-24 lg:pb-28 -mt-1">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 animate-fadeInUp">Artigos & Publicações</h1>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto animate-fadeInUp delay-200">
            Análises jurídicas, dicas e informações relevantes para você e seu negócio.
          </p>
        </div>
      </section>

      {/* Busca */}
      <section className="py-6 sm:py-8 bg-gray-50 border-b px-4">
        <div className="container-custom flex justify-center">
          <input
            type="text"
            placeholder="Buscar artigos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 sm:py-3 text-sm sm:text-base rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </section>

      {/* Lista de Artigos */}
      <section className="py-12 sm:py-14 md:py-16 bg-white px-4">
        <div className="container-custom">
          {filteredPosts.length === 0 ? (
            <p className="text-center text-gray-500 text-sm sm:text-base">Nenhum artigo encontrado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredPosts.map((post) => (
                <article key={post.slug} className="bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                  
                  {/* Imagem */}
                  {post.data.image && (
                    <div className="w-full overflow-hidden">
                      <img 
                        src={post.data.image} 
                        alt={post.data.title} 
                        className="w-full h-40 sm:h-44 md:h-48 object-cover hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  )}
                  
                  {/* Conteúdo */}
                  <div className="p-4 sm:p-5 md:p-6">
                    <span className="inline-block text-xs sm:text-sm text-accent font-semibold mb-1 sm:mb-2">
                      {post.data.category || 'Direito'}
                    </span>
                    
                    <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary mb-2 line-clamp-2">
                      <Link to={`/blog/${post.slug}`} className="hover:text-accent transition-colors">
                        {post.data.title || 'Sem título'}
                      </Link>
                    </h2>
                    
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-3">
                      {post.data.description || post.content}
                    </p>
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-xs sm:text-sm text-gray-500">
                      <span>
                        {post.data.date ? new Date(post.data.date).toLocaleDateString('pt-BR') : 'Data não informada'}
                      </span>
                      <Link 
                        to={`/blog/${post.slug}`}
                        className="text-accent font-medium hover:underline flex items-center gap-1"
                      >
                        <span>Ler mais</span>
                        <i className="fas fa-arrow-right text-xs"></i>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <WhatsAppButton whatsapp={content.whatsapp} />
      <Footer 
        siteName={content.siteName} 
        oab={content.oab} 
        phone={content.phone} 
        email={content.email} 
        address={content.address} 
        whatsapp={content.whatsapp} 
      />
    </div>
  );
}
