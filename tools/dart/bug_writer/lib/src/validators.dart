import 'models.dart';

/// Mirrors `createBugSchema` in `src/app/actions.ts` so a draft that passes
/// here will pass on the server too. Anchor any rule changes to the Zod schema.
class BugValidator {
  static const titleMin = 3;
  static const titleMax = 120;
  static const descriptionMin = 10;
  static const descriptionMax = 2000;
  static const authorMin = 1;
  static const authorMax = 40;

  static List<ValidationError> validateDraft(Draft d) {
    final errors = <ValidationError>[];

    final title = d.title.trim();
    if (title.length < titleMin) {
      errors.add(ValidationError('title', 'must be at least $titleMin characters'));
    } else if (title.length > titleMax) {
      errors.add(ValidationError('title', 'must be at most $titleMax characters'));
    }

    final description = d.description.trim();
    if (description.length < descriptionMin) {
      errors.add(
          ValidationError('description', 'must be at least $descriptionMin characters'));
    } else if (description.length > descriptionMax) {
      errors.add(
          ValidationError('description', 'must be at most $descriptionMax characters'));
    }

    if (d.category == null) {
      errors.add(ValidationError('category', 'is required'));
    }

    final author = d.author.trim();
    if (author.length < authorMin) {
      errors.add(ValidationError('author', 'is required'));
    } else if (author.length > authorMax) {
      errors.add(ValidationError('author', 'must be at most $authorMax characters'));
    }

    return errors;
  }

  /// Runs validation and converts to a [Bug] on success.
  static Bug toBug(Draft d) {
    final errors = validateDraft(d);
    if (errors.isNotEmpty) {
      throw ValidationError(
          'draft', 'has ${errors.length} validation error(s): ${errors.join(', ')}');
    }
    return Bug(
      title: d.title.trim(),
      description: d.description.trim(),
      category: d.category!,
      author: d.author.trim(),
    );
  }
}
