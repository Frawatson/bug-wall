import 'dart:io';

import 'package:args/command_runner.dart';
import 'package:bug_writer/src/commands.dart';
import 'package:bug_writer/src/dedupe_command.dart';
import 'package:bug_writer/src/models.dart';

Future<void> main(List<String> args) async {
  final runner = CommandRunner<int>(
    'bug_writer',
    'Draft, validate, and submit Bug Wall bugs from the command line.',
  )
    ..addCommand(NewCommand())
    ..addCommand(ListCommand())
    ..addCommand(ValidateCommand())
    ..addCommand(SubmitCommand())
    ..addCommand(DedupeCommand());

  try {
    final code = await runner.run(args) ?? 0;
    exit(code);
  } on UsageException catch (e) {
    stderr.writeln(e);
    exit(2);
  } on StateError catch (e) {
    stderr.writeln('Error: ${e.message}');
    exit(1);
  } on ValidationError catch (e) {
    stderr.writeln('Validation error: $e');
    exit(1);
  } on FormatException catch (e) {
    stderr.writeln('Bad input: ${e.message}');
    exit(1);
  } on SocketException catch (e) {
    stderr.writeln('Network error: ${e.message}');
    exit(1);
  } on FileSystemException catch (e) {
    stderr.writeln('Filesystem error: ${e.message} (${e.path})');
    exit(1);
  } catch (e) {
    stderr.writeln('Unexpected error: $e');
    exit(1);
  }
}
