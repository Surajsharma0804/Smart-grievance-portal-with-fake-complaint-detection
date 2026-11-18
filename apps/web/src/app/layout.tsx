import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nagrik Setu (नागरिक सेतु) | Smart Grievance Redressal Portal',
  description: 'Civic grievance redressal platform with complaint verification, SLA tracking, and transparent resolution.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var clean = function(node) {
                    if (!node || node.nodeType !== 1) return;
                    if (node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                    if (node.hasAttribute('bis_register')) node.removeAttribute('bis_register');
                  };
                  var observer = new MutationObserver(function(mutations) {
                    for (var i = 0; i < mutations.length; i++) {
                      var m = mutations[i];
                      if (m.type === 'attributes' && (m.attributeName === 'bis_skin_checked' || m.attributeName === 'bis_register')) {
                        m.target.removeAttribute(m.attributeName);
                      } else if (m.type === 'childList') {
                        for (var j = 0; j < m.addedNodes.length; j++) {
                          var el = m.addedNodes[j];
                          clean(el);
                          if (el.querySelectorAll) {
                            var children = el.querySelectorAll('[bis_skin_checked], [bis_register]');
                            for (var k = 0; k < children.length; k++) {
                              children[k].removeAttribute('bis_skin_checked');
                              children[k].removeAttribute('bis_register');
                            }
                          }
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['bis_skin_checked', 'bis_register'],
                    childList: true,
                    subtree: true
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
