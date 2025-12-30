import 'package:bloc/bloc.dart';
import 'package:meta/meta.dart';

part 'owner_event.dart';
part 'owner_state.dart';

class OwnerBloc extends Bloc<OwnerEvent, OwnerState> {
  OwnerBloc() : super(OwnerInitial()) {
    on<OwnerEvent>((event, emit) {
      // TODO: implement event handler
    });
  }
}
