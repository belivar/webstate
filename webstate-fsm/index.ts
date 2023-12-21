
import {
  EventObject,
  InterpreterStatus,
  StateMachine,
  Typestate
} from './types';

function toActionObject<TContext extends object, TEvent extends EventObject>(
  action: {
    runtime: string,
    actions: any
  },
  actionMap: StateMachine.ActionMap<TContext, TEvent> | undefined 
) {
  if(!action.actions || !actionMap) {
    return action;
  }
  let actions;
  if(typeof action.actions === 'string' && actionMap[action.actions]) actions = actionMap[action.actions];
  if(action.actions instanceof Array) {
    actions = action.actions
    .filter((act: string) => actionMap[act])
    .map((act: string) => actionMap[act]);
  }
  return {
    runtime: action.runtime,
    actions: actions
  }
}

// 创建一个匹配器，用于比较状态值
function createMatcher(value: string) {
  return (stateValue: string) => value === stateValue;
}

function handleActions<
  TEvent extends EventObject = EventObject
>(
  actions: Array<StateMachine.ActionObject<TEvent>>,
  runtime: string
): [Array<StateMachine.ActionObject<TEvent>>] {
  const nonAssignActions = actions.filter((action) => action.runtime === runtime);
  return [nonAssignActions];
}

// 导出一个函数，用于创建一个状态机
export function createMachine<
  TContext extends object,
  TEvent extends EventObject = EventObject,
  TState extends Typestate = { value: any; }
>(
  // 状态机配置
  fsmConfig: StateMachine.Config<TContext, TEvent, TState>,
  // 实现
  implementations: {
    actions?: StateMachine.ActionMap<TContext, TEvent>;
  } = {}
): StateMachine.Machine<TContext, TEvent, TState> {
  // 获取初始动作和上下文
  const initial:string | TState["value"] = fsmConfig.initial;
  const initialData = fsmConfig.states[initial];
  const allActions = initialData?.handle.map((handle: any) => toActionObject(handle, implementations.actions))

  // 初始状态
  const machine = {
    config: fsmConfig,
    _options: implementations,
    initialState: {
      value: fsmConfig.initial,
      ui: initialData.ui,
      explain: initialData.explain,
      allActions: allActions,
      matches: createMatcher(fsmConfig.initial)
    },
    // 转换
    transition: (
      state: string | TState["value"]
    ): StateMachine.State<TEvent, TState> => {
      const stateConfig =  fsmConfig.states[state];
      if (stateConfig?.handle) {
        const allActions = stateConfig.handle.map((handle: any) => toActionObject(handle, implementations.actions))
        return {
          value: state,
          ui: stateConfig.ui,
          explain: stateConfig.explain,
          allActions: allActions,
          matches: createMatcher(state)
        };
      }
      // 没有转换匹配
      return {
        value: state,
        ui: stateConfig.ui,
        explain: stateConfig.explain,
        allActions: allActions,
        matches: createMatcher(state)
      };
    }
  };
  return machine;
}

// 定义一个函数，用于执行状态机的状态动作
const executeStateActions = (
  allActions: any[]
) => {
  // const actions = allActions[0];
  allActions[0]?.map((exec: any) => {
    if(typeof exec.actions === 'function') exec.actions && exec.actions();
    else exec.actions.map((exe: any) => exe && exe());
  });
}
 
// 导出一个函数，用于解释状态机
export function interpret<
  TContext extends object,
  TEvent extends EventObject = EventObject,
  TState extends Typestate = { value: any; }
>(
  machine: StateMachine.Machine<TContext, TEvent, TState>
): StateMachine.Service<TContext, TEvent, TState> {
  // 初始化状态
  let state = machine.initialState;
  // 初始化状态机状态
  let status = InterpreterStatus.NotStarted;
  // 初始化监听器
  const listeners = new Set<StateMachine.StateListener<typeof state>>();
  // 初始化服务
  const service = {
    _machine: machine,
    // 发送事件
    send: (event: string): void => {
      // 如果状态机没有运行，则返回
      if (status !== InterpreterStatus.Running) return;
      // 更新状态
      state = machine.transition(event);
      // 执行状态动作
      service.handleExecuteActions('entry');
      // 执行监听器
      listeners.forEach((listener) => listener(state));
    },
    // 订阅状态
    subscribe: (listener: StateMachine.StateListener<typeof state>) => {
      // 添加监听器
      listeners.add(listener);
      // 执行监听器
      listener(state);
      return {
        // 取消订阅
        unsubscribe: () => listeners.delete(listener)
      };
    },
    // 开始状态机
    start: () => {
      state = machine.initialState;
      // 设置状态机状态为运行
      status = InterpreterStatus.Running;
      // 执行状态动作
      service.handleExecuteActions('entry');
      return service;
    },
    // 处理动作
    handleExecuteActions:(event: string) => {
      executeStateActions(handleActions(state.allActions, event));
      return service;
    },
    // 停止状态机
    stop: () => {
      // 设置状态机状态为停止
      status = InterpreterStatus.Stopped;
      // 清空监听器
      listeners.clear();
      return service;
    },
    // 获取状态
    get state() {
      return state;
    },
    // 获取状态机状态
    get status() {
      return status;
    }
  };

  return service;
}

