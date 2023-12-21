import { shallowRef, onMounted, onBeforeUnmount, Ref } from 'vue';
import {
  createMachine,
  interpret,
} from '../../utils/amsstate';
import {
  StateMachine,
  EventObject,
  Typestate
} from '../../utils/amsstate/types';
const getServiceValue = <
  TContext extends object,
  TEvent extends EventObject = EventObject,
  TState extends Typestate = { value: any; }
>(
  service: StateMachine.Service<TContext, TEvent, TState>
): StateMachine.State<TEvent, TState> => {
  let currentValue: StateMachine.State<TEvent, TState>;
  service
    .subscribe((state) => {
      currentValue = state;
    })
    .unsubscribe();
  return currentValue!;
};

export function useMachine<
  TContext extends object,
  TEvent extends EventObject = EventObject,
  TState extends Typestate = { value: any; }
>(
  stateMachine: StateMachine.Config<TContext, TEvent, any>,
  options?: {
    actions?: StateMachine.ActionMap<TContext, TEvent>;
  }
): {
  state: Ref<StateMachine.State<TEvent, TState>>;
  update: any,
  send: StateMachine.Service<TContext, TEvent>['handleExecuteActions'];
  service: StateMachine.Service<TContext, TEvent>;
} {
  const service = interpret(
    createMachine(
      stateMachine,
      options ? options : (stateMachine as any)._options
    )
  ).start();

  const state = shallowRef<StateMachine.State<TEvent, any>>(
    getServiceValue(service)
  );

  const update = async(data: any) => {
     const { states } = stateMachine;
    if(!data || !states) return;
    const presentStatesList = Object.keys(states).filter(item => handleContrastData(item, data));
    if(!presentStatesList) return;
    service.send(presentStatesList[0]);
  }

  const handleContrastData = (eventPattern: string, data: Record<string, any>) => {
    const handleList = eventPattern.split(/[*%]/).filter((_, index) => index % 2 === 0);
    return handleList.map((element, index) => `${element}%${data[element]}${index + 1 === handleList.length ? '' : '*'}`).join('') === eventPattern;
  }

  onMounted(() => {
    service.subscribe((currentState) => (state.value = currentState));
  });

  onBeforeUnmount(service.stop);

  return { state, update, send: service.handleExecuteActions, service };
}