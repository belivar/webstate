type AnyFunction = (...args: any[]) => any;
type ReturnTypeOrValue<T> = T extends AnyFunction ? ReturnType<T> : T;
// 功能是用来得到一个函数的返回值类型。
export enum InterpreterStatus {
  NotStarted = 0,
  Running = 1,
  Stopped = 2
}

export type SingleOrArray<T> = T[] | T;
export interface EventObject {
  type: string;
}

export type InitEvent = { type: 'xstate.init' };

export type ContextFrom<T> = ReturnTypeOrValue<T> extends infer R
  ? R extends StateMachine.Machine<infer TContext, any, any>
    ? TContext
    : R extends StateMachine.Service<infer TContext, any, any>
    ? TContext
    : never
  : never;

export type EventFrom<T> = ReturnTypeOrValue<T> extends infer R
  ? R extends StateMachine.Machine<any, infer TEvent, any>
    ? TEvent
    : R extends StateMachine.Service<any, infer TEvent, any>
    ? TEvent
    : never
  : never;

export type StateFrom<T> = ReturnTypeOrValue<T> extends infer R
  ? R extends StateMachine.Machine<infer TContext, infer TEvent, infer TState>
    ? StateMachine.State<TEvent, TState>
    : R extends StateMachine.Service<infer TContext, infer TEvent, infer TState>
    ? StateMachine.State<TEvent, TState>
    : never
  : never;

export type ServiceFrom<T> = ReturnTypeOrValue<T> extends infer R
  ? R extends StateMachine.Machine<infer TContext, infer TEvent, infer TState>
    ? StateMachine.Service<TContext, TEvent, TState>
    : never
  : never;

export type MachineImplementationsFrom<
  TMachine extends StateMachine.AnyMachine
> = {
  actions?: StateMachine.ActionMap<ContextFrom<TMachine>, EventFrom<TMachine>>;
};

export namespace StateMachine {
  export type Action<TContext extends object, TEvent extends EventObject> =
    | string
    | AssignActionObject<TContext, TEvent>
    | ActionObject<TEvent>
    | ActionFunction<TEvent>;

  export type ActionMap<
    TContext extends object,
    TEvent extends EventObject
  > = Record<string, Exclude<Action<TContext, TEvent>, string>>;

  export interface ActionObject<
    TEvent extends EventObject
  > {
    type: string;
    exec?: ActionFunction<TEvent>;
    [key: string]: any;
  }

  export type ActionFunction<
    TEvent extends EventObject
  > = (event: TEvent | InitEvent) => void;

  export type AssignAction = 'xstate.assign';

  export interface AssignActionObject<
    TContext extends object,
    TEvent extends EventObject
  > extends ActionObject<TEvent> {
    type: AssignAction;
    assignment: Assigner<TContext, TEvent> | PropertyAssigner<TContext, TEvent>;
  }

  export type Transition<TContext extends object, TEvent extends EventObject> =
    | string
    | {
        target?: string;
        actions?: SingleOrArray<Action<TContext, TEvent>>;
        cond?: (context: TContext, event: TEvent) => boolean;
      };
  export interface State<
    TEvent extends EventObject,
    TState extends Typestate
  > {
    value: TState['value'];
    allActions: Array<ActionObject<TEvent>>,
    ui?: any,
    explain?: string,
    matches: <TSV extends TState['value']>(
      value: TSV
    ) => this is TState extends { value: TSV }
      ? TState & { value: TSV }
      : never;
  }

  export type AnyMachine = StateMachine.Machine<any, any, any>;

  export type AnyService = StateMachine.Service<any, any, any>;

  export type AnyState = State<any, any>;

  export interface Config<
    TContext extends object,
    TEvent extends EventObject,
    TState extends Typestate = { value: any; context: TContext }
  > {

    id?: string;
    initial: string;
    context?: TContext;
    states: {
      [key in TState['value']]: {
        on?: {
          [K in TEvent['type']]?: SingleOrArray<
            Transition<TContext, TEvent extends { type: K } ? TEvent : never>
          >;
        };
        exit?: SingleOrArray<Action<TContext, TEvent>>;
        entry?: SingleOrArray<Action<TContext, TEvent>>;
        ui?: any;
        handle?: any;
        explain?: string;
      };
    };
  }

  export interface Machine<
    TContext extends object,
    TEvent extends EventObject,
    TState extends Typestate
  > {
    config: StateMachine.Config<TContext, TEvent, TState>;
    initialState: State<TEvent, TState>;
    transition: (
      state: string
    ) => any;
  }

  export type StateListener<T extends AnyState> = (state: T) => void;

 // 导出接口Service，它接受三个类型参数：TContext，TEvent，TState，其中TState的默认值为{ value: any; context: TContext }
 export interface Service<
    TContext extends object,
    TEvent extends EventObject,
    TState extends Typestate = { value: any; }
  > {
    // 发送事件
    send: (event: string) => void;
    // 订阅状态
    subscribe: (
      listener: StateListener<State<TEvent, TState>>
    ) => {
      // 取消订阅
      unsubscribe: () => void;
    };
    // 启动服务
    start: () => Service<TContext, TEvent, TState>;
    // 停止服务
    stop: () => Service<TContext, TEvent, TState>;
    handleExecuteActions: (event: string) => Service<TContext, TEvent, TState>;
    // 读取解释器状态
    readonly status: InterpreterStatus;
    // 读取状态
    readonly state: State<TEvent, TState>;
  }
// 功能和Mutable 相反，功能是将类型的属性「变成只读」， 在属性前面增加 readonly 意思会将其变成只读。
  export type Assigner<TContext extends object, TEvent extends EventObject> = (
    event: TEvent
  ) => Partial<TContext>;
// 功能是将类型的属性「变成可选」。注意这是浅 Partial，DeepPartial 上面我讲过了，只要配合递归调用使用即可。

  export type PropertyAssigner<
    TContext extends object,
    TEvent extends EventObject
  > = {
    [K in keyof TContext]?:
      | ((event: TEvent) => TContext[K])
      | TContext[K];
  };
}

// 导出接口Typestate
export interface Typestate {
  value: string;
}
export type ExtractEvent<
  TEvent extends EventObject,
  TEventType extends TEvent['type']
> = TEvent extends { type: TEventType } ? TEvent : never;
