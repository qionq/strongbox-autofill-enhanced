import React, { useEffect, useState } from 'react';
import { useCustomStyle } from '../../Contexts/CustomStyleContext';
import { Box } from '@mui/material';
import Markdown, { Components } from 'react-markdown';
import gfm from 'remark-gfm';


import SyntaxHighlighter from 'react-syntax-highlighter';

import stackoverflowLight from '../Styles/markdown-styles/stackoverflow-light';

import stackoverflowDark from '../Styles/markdown-styles/stackoverflow-dark';

interface Props {
  text: string;
  onRedirectUrl: (url: string) => void;
}

function CustomMarkDown(props: Props) {
  const { text, onRedirectUrl } = props;
  const { darkMode } = useCustomStyle();
  const [style, setStyle] = useState<Record<string, React.CSSProperties>>(stackoverflowLight);

  const onMarkdownClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (event.target instanceof HTMLAnchorElement) {
      const href = event.target.getAttribute('href');
      if (href) onRedirectUrl(href);
    }
  };

  const markdownComponents: Components = {
    code({ className, children }) {
      const match = /language-(\w+)/.exec(className || '');
      return match ? (
        <SyntaxHighlighter style={style} PreTag="div" language={match[1]}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className || ''}>{children}</code>
      );
    },
  };

  useEffect(() => {
    if (darkMode) {
      setStyle(stackoverflowDark);
    } else {
      setStyle(stackoverflowLight);
    }
  }, [darkMode]);

  return (
    <Box onClick={onMarkdownClick}>
      <article className="markdown-body">
        <Markdown
          components={markdownComponents}
          remarkPlugins={[gfm]}
        >
          {text}
        </Markdown>
      </article>
    </Box>
  );
}

export default CustomMarkDown;
