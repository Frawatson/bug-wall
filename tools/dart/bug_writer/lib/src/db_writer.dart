import 'dart:io';

import 'package:postgres/postgres.dart';

import 'models.dart';

/// Inserts a [Bug] into the Postgres `bugs` table. Uses `DATABASE_URL` from the
/// environment, parsed in the same libpq style the rest of the codebase uses.
class DbWriter {
  static const _localHosts = {'localhost', '127.0.0.1', '::1', '[::1]'};

  Future<int> insertBug(Bug bug) async {
    final url = Platform.environment['DATABASE_URL'];
    if (url == null || url.isEmpty) {
      throw StateError('DATABASE_URL is not set');
    }
    final Uri uri;
    try {
      uri = Uri.parse(url);
    } on FormatException catch (e) {
      throw StateError('Invalid DATABASE_URL: ${e.message}');
    }
    if (uri.host.isEmpty) {
      throw StateError('DATABASE_URL is missing a host');
    }
    final database =
        uri.path.startsWith('/') ? uri.path.substring(1) : uri.path;
    if (database.isEmpty) {
      throw StateError('DATABASE_URL is missing a database name');
    }

    final userInfo = uri.userInfo;
    final colon = userInfo.indexOf(':');
    final username = colon < 0 ? userInfo : userInfo.substring(0, colon);
    final password = colon < 0 ? '' : userInfo.substring(colon + 1);

    final useSsl = !_localHosts.contains(uri.host);

    final conn = await Connection.open(
      Endpoint(
        host: uri.host,
        port: uri.port == 0 ? 5432 : uri.port,
        database: database,
        username: Uri.decodeComponent(username),
        password: Uri.decodeComponent(password),
      ),
      settings: ConnectionSettings(
        sslMode: useSsl ? SslMode.require : SslMode.disable,
      ),
    );

    try {
      final result = await conn.execute(
        Sql.named(
          'INSERT INTO bugs (title, description, category, author, upvotes, downvotes) '
          'VALUES (@title, @description, (@category) :: category, @author, @up, @down) '
          'RETURNING id',
        ),
        parameters: {
          'title': bug.title,
          'description': bug.description,
          'category': bug.category.name,
          'author': bug.author,
          'up': bug.upvotes,
          'down': bug.downvotes,
        },
      );
      if (result.isEmpty) {
        throw StateError('insert returned no rows');
      }
      return result.first[0] as int;
    } finally {
      await conn.close();
    }
  }
}
