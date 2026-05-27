"""Tests for Page model helpers used as the central PDF dispatch."""

from django.db import IntegrityError, transaction
from django.test import TestCase

from pages.tests.factories import FolderFactory, PageFactory, ProjectFactory


class TestPageIsPdf(TestCase):
    def test_is_pdf_true_when_filetype_is_pdf(self):
        page = PageFactory(details={"filetype": "pdf", "content": ""})
        self.assertTrue(page.is_pdf)

    def test_is_pdf_false_for_md(self):
        page = PageFactory(details={"filetype": "md", "content": "hello"})
        self.assertFalse(page.is_pdf)

    def test_is_pdf_false_for_csv(self):
        page = PageFactory(details={"filetype": "csv", "content": "a,b,c"})
        self.assertFalse(page.is_pdf)

    def test_is_pdf_false_for_log(self):
        page = PageFactory(details={"filetype": "log", "content": "..."})
        self.assertFalse(page.is_pdf)

    def test_is_pdf_false_when_filetype_missing(self):
        page = PageFactory(details={"content": "no filetype"})
        self.assertFalse(page.is_pdf)

    def test_is_pdf_false_when_details_is_none(self):
        page = PageFactory(details={})
        page.details = None
        self.assertFalse(page.is_pdf)


class TestPageGetTextContent(TestCase):
    def test_returns_extracted_text_for_pdf(self):
        page = PageFactory(
            details={
                "filetype": "pdf",
                "schema_version": 2,
                "content": "",
                "extracted_text": "Hello from the PDF body.",
                "pdf_file_id": "abc123",
            }
        )
        self.assertEqual(page.get_text_content(), "Hello from the PDF body.")

    def test_returns_empty_string_when_pdf_has_no_extracted_text(self):
        page = PageFactory(details={"filetype": "pdf", "content": ""})
        self.assertEqual(page.get_text_content(), "")

    def test_returns_content_for_md(self):
        page = PageFactory(details={"filetype": "md", "content": "# Hello"})
        self.assertEqual(page.get_text_content(), "# Hello")

    def test_returns_content_for_csv(self):
        page = PageFactory(details={"filetype": "csv", "content": "a,b\n1,2"})
        self.assertEqual(page.get_text_content(), "a,b\n1,2")

    def test_returns_empty_string_when_content_missing(self):
        page = PageFactory(details={"filetype": "md"})
        self.assertEqual(page.get_text_content(), "")

    def test_pdf_ignores_content_field(self):
        # PDF pages may have a stale or empty content field — extracted_text wins.
        page = PageFactory(
            details={
                "filetype": "pdf",
                "content": "should be ignored",
                "extracted_text": "actual pdf body",
            }
        )
        self.assertEqual(page.get_text_content(), "actual pdf body")


class TestPageContentForEmbedding(TestCase):
    def test_uses_extracted_text_for_pdf(self):
        page = PageFactory(
            title="My PDF",
            details={
                "filetype": "pdf",
                "content": "",
                "extracted_text": "First paragraph.\nSecond paragraph.",
            },
        )
        self.assertEqual(
            page.content_for_embedding,
            "My PDF\n\nFirst paragraph.\nSecond paragraph.",
        )

    def test_uses_content_for_markdown(self):
        page = PageFactory(
            title="Notes",
            details={"filetype": "md", "content": "Hello world"},
        )
        self.assertEqual(page.content_for_embedding, "Notes\n\nHello world")

    def test_returns_empty_when_pdf_has_no_extracted_text_and_no_title(self):
        page = PageFactory(title="", details={"filetype": "pdf", "content": ""})
        self.assertEqual(page.content_for_embedding, "")


class TestPageDailyNoteUniqueConstraint(TestCase):
    """Pin the partial unique index used to make /daily-note/today/ race-safe.

    The constraint is scoped to `(project, folder, title) WHERE is_deleted=False
    AND title ~ '^\\d{4}-\\d{2}-\\d{2}$'`. The narrow regex condition is
    intentional — pages with non-date titles can still legitimately share
    a (project, folder, title) tuple (e.g., two "Untitled" pages)."""

    def _create_daily_note(self, project, folder, title):
        return PageFactory(project=project, folder=folder, title=title)

    def test_duplicate_daily_note_in_same_folder_is_rejected(self):
        project = ProjectFactory()
        folder = FolderFactory(project=project)
        self._create_daily_note(project, folder, "2026-04-18")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self._create_daily_note(project, folder, "2026-04-18")

    def test_different_dates_in_same_folder_are_allowed(self):
        project = ProjectFactory()
        folder = FolderFactory(project=project)
        self._create_daily_note(project, folder, "2026-04-18")
        self._create_daily_note(project, folder, "2026-04-19")  # must not raise

    def test_same_date_in_different_folders_is_allowed(self):
        project = ProjectFactory()
        folder_a = FolderFactory(project=project, name="04")
        folder_b = FolderFactory(project=project, name="05")
        self._create_daily_note(project, folder_a, "2026-04-18")
        self._create_daily_note(project, folder_b, "2026-04-18")  # must not raise

    def test_same_date_in_different_projects_is_allowed(self):
        project_a = ProjectFactory()
        project_b = ProjectFactory()
        folder_a = FolderFactory(project=project_a)
        folder_b = FolderFactory(project=project_b)
        self._create_daily_note(project_a, folder_a, "2026-04-18")
        self._create_daily_note(project_b, folder_b, "2026-04-18")  # must not raise

    def test_non_date_duplicates_are_still_allowed(self):
        """Two `Untitled` pages in the same folder must coexist — the
        constraint's `title__regex` condition keeps non-date titles out."""
        project = ProjectFactory()
        folder = FolderFactory(project=project)
        PageFactory(project=project, folder=folder, title="Untitled")
        PageFactory(project=project, folder=folder, title="Untitled")  # must not raise

    def test_soft_deleted_daily_note_does_not_block_re_creation(self):
        """The constraint is `WHERE is_deleted=False`, so a tombstoned row
        must not occupy the unique slot."""
        project = ProjectFactory()
        folder = FolderFactory(project=project)
        original = self._create_daily_note(project, folder, "2026-04-18")
        original.is_deleted = True
        original.save(update_fields=["is_deleted", "modified"])

        # Should not raise — the tombstone is filtered out by the partial index.
        self._create_daily_note(project, folder, "2026-04-18")
