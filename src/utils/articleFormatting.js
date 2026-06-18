const MAJOR_HEADING_PATTERN =
  /^(introdução|conclusão|a importância|a usucapião|a adjudicação|a atuação|a regularização)/i;

export function normalizeArticleMarkdown(markdown = '') {
  let standaloneBoldIndex = 0;

  return markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const text = block.trim();

      if (!text) return '';

      const isStandaloneBold =
        text.startsWith('**') &&
        !text.startsWith('***') &&
        text.endsWith('**') &&
        !text.endsWith('***');

      if (isStandaloneBold) {
        const value = text.slice(2, -2).trim();
        const isFirstBoldBlock = standaloneBoldIndex === 0;
        standaloneBoldIndex += 1;

        if (isFirstBoldBlock && value.length > 100) {
          return `<p class="article-deck">${value}</p>`;
        }

        if (/^por\s+/i.test(value)) {
          return `<p class="article-byline">${value}</p>`;
        }

        if (/^lembre-se:/i.test(value)) {
          return `> **${value}**`;
        }

        const headingLevel = MAJOR_HEADING_PATTERN.test(value) ? '##' : '###';
        return `${headingLevel} ${value}`;
      }

      const compactText = text.replace(/\n+/g, ' ').trim();
      const semicolonCount = (compactText.match(/;/g) || []).length;
      const hasMarkdownStructure = /^(#{1,6}\s|[-*>]\s|\d+\.\s|```)/.test(compactText);

      if (!hasMarkdownStructure && semicolonCount >= 2) {
        const items = compactText
          .split(';')
          .map((item) => item.trim())
          .filter(Boolean);

        if (items.length >= 3 && items.every((item) => item.length <= 180)) {
          return items.map((item) => `- ${item.replace(/\.$/, '')}`).join('\n');
        }
      }

      return text;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function createArticleExcerpt(markdown = '', maxLength = 170) {
  const blocks = markdown
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (/^\*\*[\s\S]{100,}\*\*$/.test(blocks[0] || '')) {
    blocks.shift();
  }

  if (/^\*\*por\s+/i.test(blocks[0] || '')) {
    blocks.shift();
  }

  if (/^\*\*[^*]{1,80}\*\*$/.test(blocks[0] || '')) {
    blocks.shift();
  }

  const text = blocks
    .join(' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_~`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}...`;
}
