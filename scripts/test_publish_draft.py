import hashlib
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('publish_draft', Path(__file__).with_name('publish-draft.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
SHA = 'a' * 40


class FakeGitHub:
    def __init__(self, *, draft=True, sha=SHA, existing=True):
        self.repository = 'hikariatama/libmov'
        self.existing = existing
        self.sha = sha
        self.release = {'id': 1, 'tag_name': 'v0.0.1', 'draft': draft, 'upload_url': 'https://uploads.github.com/assets{?name}'}
        self.assets = [{'id': 2, 'name': 'stale-package.zip'}] if existing else []
        self.mutations = []

    def pages(self, path):
        return iter(([self.release] if self.existing else []) if path == '/releases' else list(self.assets))

    def request(self, method, path, data=None, *, upload=None):
        if method == 'GET':
            if path.startswith('/git/ref/tags/') and not self.existing:
                return None
            return {'object': {'sha': self.sha, 'type': 'commit'}}
        self.mutations.append((method, path, data))
        if method == 'DELETE':
            self.assets = []
            return None
        if upload is not None:
            asset = {'id': 3, 'name': upload.name, 'size': upload.stat().st_size,
                     'digest': 'sha256:' + hashlib.sha256(upload.read_bytes()).hexdigest()}
            self.assets.append(asset)
            return asset
        if path in ('/releases/1', '/releases'):
            self.release.update(data)
            return self.release
        return {}


class DraftReleaseTests(unittest.TestCase):
    def test_missing_package_fails_before_publishing(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(ValueError):
                release.collect_artifacts(Path(root), ['missing.zip'])

    def test_draft_rebuild_preserves_tag_and_replaces_all_assets(self):
        github = FakeGitHub()
        with tempfile.TemporaryDirectory() as root:
            package = Path(root) / 'app.zip'
            package.write_bytes(b'verified build')
            files = release.collect_artifacts(Path(root), ['app.zip'])
            notes = Path(__file__).with_name('release-notes.md').read_text().strip()
            draft, _ = release.publish(github, '0.0.1', SHA, files, notes=notes)
        self.assertTrue(draft['draft'])
        self.assertEqual(draft['name'], 'libmov v0.0.1')
        self.assertEqual(draft['body'], notes)
        self.assertEqual({a['name'] for a in github.assets}, {'app.zip', 'SHA256SUMS.txt'})
        self.assertFalse(any(path.startswith('/git/') for _, path, _ in github.mutations))
        self.assertTrue(any(method == 'DELETE' for method, _, _ in github.mutations))

    def test_first_release_starts_as_draft(self):
        github = FakeGitHub(existing=False)
        with tempfile.TemporaryDirectory() as root:
            package = Path(root) / 'app.zip'
            package.write_bytes(b'first build')
            files = release.collect_artifacts(Path(root), ['app.zip'])
            current, _ = release.publish(github, '0.0.1', SHA, files)
        self.assertTrue(current['draft'])
        self.assertTrue(any(method == 'POST' and path == '/releases' for method, path, _ in github.mutations))
        self.assertFalse(any(method == 'DELETE' for method, _, _ in github.mutations))

    def test_published_rebuild_is_rejected_before_mutations(self):
        github = FakeGitHub(draft=False)
        with self.assertRaises(RuntimeError):
            release.publish(github, '0.0.1', SHA, {})
        self.assertEqual(github.mutations, [])

    def test_mismatched_tag_is_rejected_before_mutations(self):
        github = FakeGitHub()
        original = github.request
        github.request = lambda method, path, *args, **kwargs: ({'object': {'sha': 'b' * 40}}
            if path.startswith('/git/ref/tags/') else original(method, path, *args, **kwargs))
        with self.assertRaises(RuntimeError):
            release.publish(github, '0.0.1', SHA, {})
        self.assertEqual(github.mutations, [])

    def test_matching_annotated_tag_is_preserved(self):
        github = FakeGitHub()
        original = github.request
        def request(method, path, *args, **kwargs):
            if path.startswith('/git/ref/tags/'):
                return {'object': {'sha': 'c' * 40, 'type': 'tag'}}
            if path.startswith('/git/tags/'):
                return {'object': {'sha': SHA, 'type': 'commit'}}
            return original(method, path, *args, **kwargs)
        github.request = request
        release.publish(github, '0.0.1', SHA, {}, ref='refs/tags/v0.0.1')
        self.assertFalse(any(path.startswith('/git/') for _, path, _ in github.mutations))

    def test_new_release_creates_tag_without_force(self):
        github = FakeGitHub(existing=False)
        release.publish(github, '0.0.1', SHA, {})
        self.assertIn(('POST', '/git/refs', {'ref': 'refs/tags/v0.0.1', 'sha': SHA}), github.mutations)

    def test_stale_build_cannot_replace_current_draft(self):
        github = FakeGitHub(sha='b' * 40)
        with self.assertRaises(RuntimeError):
            release.publish(github, '0.0.1', SHA, {})
        self.assertEqual(github.mutations, [])


if __name__ == '__main__':
    unittest.main()
