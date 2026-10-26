import shutil
import subprocess
import unittest
from pathlib import Path

SNIPPET = Path(__file__).with_name('Caddyfile.app-witnessops')


class CaddySnippetTests(unittest.TestCase):
    def setUp(self):
        self.text = SNIPPET.read_text(encoding='utf-8')

    def test_overwrites_client_ip_headers_from_the_connection(self):
        self.assertIn('Not applied. Not reloaded.', self.text)
        self.assertIn('header_up -Forwarded', self.text)
        self.assertIn('header_up X-Forwarded-For {http.request.remote.host}', self.text)
        self.assertIn('header_up X-Real-IP {http.request.remote.host}', self.text)
        self.assertIn('header_up X-Forwarded-Host app.witnessops.com', self.text)
        self.assertIn('header_up X-Forwarded-Proto https', self.text)
        self.assertIn('reverse_proxy 127.0.0.1:3020', self.text)
        self.assertNotIn('trusted_proxies', self.text)
        self.assertNotIn('{client_ip}', self.text)
        self.assertNotIn('{http.request.header.', self.text)
        self.assertNotIn('{header.', self.text)

    def test_caddy_validate_when_binary_present(self):
        binary = shutil.which('caddy')
        if binary is None:
            self.skipTest('caddy binary not available')
        subprocess.run([binary, 'validate', '--config', str(SNIPPET), '--adapter', 'caddyfile'], check=True)


if __name__ == '__main__':
    unittest.main()
