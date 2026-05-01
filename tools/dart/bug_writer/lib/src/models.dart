/// Categories supported by the Bug Wall app. Matches the Postgres `category`
/// enum and the Drizzle schema in `src/db/schema.ts`.
enum Category {
  frontend,
  backend,
  infra,
  human,
  ai;

  static Category? fromName(String name) {
    for (final c in values) {
      if (c.name == name) return c;
    }
    return null;
  }
}

/// A complete, validated bug ready to be submitted to the database.
class Bug {
  final String title;
  final String description;
  final Category category;
  final String author;
  final int upvotes;
  final int downvotes;

  const Bug({
    required this.title,
    required this.description,
    required this.category,
    required this.author,
    this.upvotes = 0,
    this.downvotes = 0,
  });
}

/// A single validation problem.
class ValidationError implements Exception {
  final String field;
  final String message;
  ValidationError(this.field, this.message);

  @override
  String toString() => '$field: $message';
}

/// Wrapper used by [Draft.copyWith] to distinguish "not provided" from
/// "explicitly set to null" without resorting to `Object?` and runtime casts.
class Boxed<T> {
  final T value;
  const Boxed(this.value);
}

/// A locally-stored bug-in-progress. May be incomplete or invalid.
class Draft {
  final String id;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String title;
  final String description;
  final Category? category;
  final String author;

  const Draft({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.title,
    required this.description,
    required this.category,
    required this.author,
  });

  /// Pass `category: Boxed(null)` to clear the category, or `Boxed(Category.x)`
  /// to set it. Omit it to leave it unchanged.
  Draft copyWith({
    String? title,
    String? description,
    Boxed<Category?>? category,
    String? author,
    DateTime? updatedAt,
  }) =>
      Draft(
        id: id,
        createdAt: createdAt,
        updatedAt: updatedAt ?? DateTime.now().toUtc(),
        title: title ?? this.title,
        description: description ?? this.description,
        category: category == null ? this.category : category.value,
        author: author ?? this.author,
      );
}
