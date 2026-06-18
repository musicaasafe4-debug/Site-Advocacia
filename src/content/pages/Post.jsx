import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import LoadingScreen from '../components/LoadingScreen'; // ← IMPORT ADICIONADO!
import { loadContent } from '/src/utils/contentLoader';
import { normalizeArticleMarkdown } from '/src/utils/articleFormatting';
import '../styles/animations.css';

// Função para extrair ID do YouTube
function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Função para processar o campo de vídeo
function processFeaturedVideo(videoData) {
  console.log('processFeaturedVideo recebeu:', videoData);
  
  if (!videoData) return null;
  
  if (typeof videoData === 'object') {
    if (videoData.type === 'youtube' && videoData.url) {
      const videoId = extractYouTubeId(videoData.url);
      if (videoId) {
        return (
          <div className="mb-8">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                style={{ border: 0 }}
                allowFullScreen
                title="Vídeo do artigo"
              />
            </div>
            {videoData.caption && (
              <p className="text-center text-sm text-gray-500 mt-2">{videoData.caption}</p>
            )}
          </div>
        );
      }
    } else if (videoData.type === 'upload' && videoData.file) {
      return (
        <div className="mb-8">
          <video
            controls
            className="w-full rounded-lg shadow-lg"
            style={{ maxHeight: '500px' }}
          >
            <source src={videoData.file} type="video/mp4" />
            Seu navegador não suporta vídeos.
          </video>
          {videoData.caption && (
            <p className="text-center text-sm text-gray-500 mt-2">{videoData.caption}</p>
          )}
        </div>
      );
    }
  }
  
  return null;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: text };

  const data = {};
  const lines = match[1].split('\n');
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line === '' || !line.includes(':')) {
      i++;
      continue;
    }
    
    const colonIndex = line.indexOf(':');
    const key = line.substring(0, colonIndex).trim();
    
    // Verifica se é um objeto aninhado (começa com espaço na próxima linha)
    if (i + 1 < lines.length && lines[i + 1].startsWith('  ')) {
      const obj = {};
      i++;
      
      while (i < lines.length && lines[i].startsWith('  ')) {
        const nestedLine = lines[i].trim();
        if (nestedLine.includes(':')) {
          const nestedColon = nestedLine.indexOf(':');
          const nestedKey = nestedLine.substring(0, nestedColon).trim();
          const nestedValue = nestedLine.substring(nestedColon + 1).trim();
          obj[nestedKey] = nestedValue;
        }
        i++;
      }
      
      data[key] = obj;
    } else {
      // Valor simples
      const value = line.substring(colonIndex + 1).trim();
      data[key] = value;
      i++;
    }
  }

  return { data, content: match[2] };
}

const renderer = new marked.Renderer();

renderer.link = (href, title, text) => {
  const youtubeId = extractYouTubeId(href);
  if (youtubeId) {
    return `
      <div style="position: relative; padding-bottom: 56.25%; height: 0; margin: 20px 0; overflow: hidden; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <iframe 
          src="https://www.youtube.com/embed/${youtubeId}" 
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
          allowfullscreen
          title="YouTube video"
        ></iframe>
      </div>
    `;
  }
  if (href.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return `
      <video controls style="width: 100%; max-height: 500px; border-radius: 12px; margin: 20px 0; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <source src="${href}" type="video/mp4">
        Seu navegador não suporta vídeos.
      </video>
    `;
  }
  return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
};

renderer.image = (href, title, text) => {
  return `
    <img 
      src="${href}" 
      alt="${text || ''}" 
      title="${title || ''}" 
      loading="lazy"
      style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    />
  `;
};

marked.setOptions({
  breaks: false,
  gfm: true,
  headerIds: true,
  mangle: false,
  renderer: renderer
});

export default function Post() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const articleRef = useRef(null);
  const [content, setContent] = useState({
    siteName: 'Edson Silva Maltez',
    oab: 'OAB/SP 344.956',
    whatsapp: '5519996319810',
    phone: '(19) 99631-9810',
    email: 'dredsonmaltez@gmail.com',
    address: 'Rua Francisco Biancalana, 31 - sala 02 - Vila Santana, Sumaré - SP'
  });

  useEffect(() => {
    async function loadData() {
      try {
        const settingsData = await loadContent('/src/content/settings/general.md');
        setContent((prev) => ({ ...prev, ...settingsData?.data }));

        const response = await fetch(`/content/posts/${slug}.md`);

        if (response.ok) {
          const text = await response.text();
          console.log('Raw frontmatter:', text);
          const { data, content } = parseFrontmatter(text);
          console.log('Dados parseados:', data);
          setPost({ slug, data, content });
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('Erro ao carregar post:', error);
        setPost(null);
      } finally {
        setTimeout(() => {
          setLoading(false);
        }, 800);
      }
    }

    loadData();
  }, [slug]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    
    const articleClone = articleRef.current.cloneNode(true);
    
    const images = articleClone.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.startsWith('http')) {
        img.src = window.location.origin + (img.src.startsWith('/') ? img.src : '/' + img.src);
      }
    });

    const articleHTML = articleClone.outerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${post?.data?.title || 'Artigo'} - ${content.siteName}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Merriweather', Georgia, serif; background-color: #F9F7F4; color: #2C3E50; line-height: 1.8; padding: 40px 20px; }
            .print-container { max-width: 800px; margin: 0 auto; background-color: white; padding: 60px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            h1 { font-size: 2.5rem; font-weight: 700; color: #1A2C3E; margin-bottom: 1rem; font-family: 'Merriweather', serif; }
            .metadata { color: #666; font-size: 0.9rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #D4AF37; }
            img { max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            video { width: 100%; max-height: 500px; border-radius: 12px; margin: 20px 0; }
            iframe { border-radius: 12px; }
            @media print { body { background-color: white; padding: 0; } .print-container { box-shadow: none; padding: 40px; } }
          </style>
        </head>
        <body>
          <div class="print-container">
            <h1>${post?.data?.title || ''}</h1>
            <div class="metadata">
              ${post?.data?.date ? new Date(post.data.date).toLocaleDateString('pt-BR') : ''} | 
              ${post?.data?.author || `Dr. ${content.siteName}`} | 
              ${content.oab}
            </div>
            ${articleHTML}
            <div class="footer-note" style="margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #ddd; font-size: 0.9rem; color: #666; text-align: center;">
              Publicado por ${content.siteName} • ${content.oab}
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleShare = async () => {
    const shareData = {
      title: post?.data?.title || 'Artigo Jurídico',
      text: post?.data?.description || 'Confira este artigo jurídico',
      url: window.location.href
    };

    try {
      if (navigator.share && window.innerWidth <= 768) {
        await navigator.share(shareData);
      } else {
        setShowShareMenu(!showShareMenu);
      }
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado!');
    setShowShareMenu(false);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`Confira este artigo: ${post?.data?.title} - ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.data?.title || '');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    setShowShareMenu(false);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(post?.data?.title || '');
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setShowShareMenu(false);
  };

  if (loading) return <LoadingScreen />;

  if (!post) {
    return (
      <div className="min-h-screen bg-primary">
        <Header siteName={content.siteName} oab={content.oab} whatsapp={content.whatsapp} />
        <div className="h-24 sm:h-28 md:h-32"></div>
        <div className="flex items-center justify-center px-4 py-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl text-center text-white px-4"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto mb-6 bg-primary/80 rounded-full flex items-center justify-center border-2 border-accent/30">
              <span className="text-4xl sm:text-5xl md:text-6xl text-accent">📜</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent mb-4">Artigo não encontrado</h1>
            <p className="text-base sm:text-lg md:text-xl text-white/70 mb-8 font-light">
              O artigo que você procura pode ter sido removido ou ainda não foi publicado.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-bold rounded-full hover:scale-105 transition-all"
            >
              ← Voltar para o blog
            </Link>
          </motion.div>
        </div>
        <Footer {...content} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Header siteName={content.siteName} oab={content.oab} whatsapp={content.whatsapp} />

      {/* Faixa Azul */}
      <section className="bg-gradient-to-r from-primary to-secondary text-white pt-40 pb-20 md:pt-44 md:pb-24 lg:pt-48 lg:pb-28">
        <div className="container-custom text-center">
          <span className="text-accent font-semibold tracking-wider uppercase text-sm mb-4 inline-block">
            DOUTRINA & JURISPRUDÊNCIA
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 break-words">
            {post.data.title}
          </h1>
          {post.data.description && (
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
              {post.data.description}
            </p>
          )}
          <div className="w-20 h-1 bg-accent mx-auto mt-8"></div>
        </div>
      </section>

      <main className="container-custom max-w-4xl w-full min-w-0 px-4 py-8">
        
        <Link to="/blog" className="inline-flex items-center gap-2 text-gray-500 hover:text-accent mb-6">
          <i className="fas fa-arrow-left"></i> Todos os artigos
        </Link>

        {/* 🎥 VÍDEO DE DESTAQUE */}
        {post.data.featured_video && processFeaturedVideo(post.data.featured_video)}

        {/* 🖼️ IMAGEM DE DESTAQUE */}
        {post.data.image && (
          <div className="mb-8 flex justify-center">
            <img
              src={post.data.image}
              alt={post.data.title}
              className="w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-1/2 h-auto rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Artigo */}
        <article 
          ref={articleRef}
          className="article-content"
        >
          <div dangerouslySetInnerHTML={{ __html: marked.parse(normalizeArticleMarkdown(post.content)) }} />
        </article>

        {/* Ações */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
          <Link to="/blog" className="text-gray-500 hover:text-accent">
            <i className="fas fa-arrow-left"></i> Todos os artigos
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-accent hover:text-accent transition-all text-sm"
              >
                <i className="fas fa-share-alt"></i>
                <span className="hidden sm:inline">Compartilhar</span>
              </button>
              
              {showShareMenu && (
                <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                  <button onClick={copyToClipboard} className="w-full px-3 py-1.5 text-left hover:bg-gray-50 text-xs">
                    <i className="fas fa-link text-accent mr-2"></i>Copiar link
                  </button>
                  <button onClick={shareOnWhatsApp} className="w-full px-3 py-1.5 text-left hover:bg-gray-50 text-xs">
                    <i className="fab fa-whatsapp text-accent mr-2"></i>WhatsApp
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-accent hover:text-accent transition-all text-sm"
            >
              <i className="fas fa-print"></i>
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>
      </main>

      <WhatsAppButton whatsapp={content.whatsapp} />
      <Footer {...content} />
    </div>
  );
}
