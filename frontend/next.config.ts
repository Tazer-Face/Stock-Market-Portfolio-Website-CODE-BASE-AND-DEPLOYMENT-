async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: `
            default-src 'self';
            connect-src 'self' https://stock-market-portfolio-website-code-base.onrender.com wss://stock-market-portfolio-website-code-base.onrender.com;
            img-src 'self' data:;
            script-src 'self' 'unsafe-inline' 'unsafe-eval';
            style-src 'self' 'unsafe-inline';
          `.replace(/\n/g, " "),
        },
      ],
    },
  ];
}
