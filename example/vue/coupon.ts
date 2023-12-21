import { useMachine } from './amsState';
import {
  StateMachine,
  EventObject,
} from '../../utils/amsstate/types';
// 活动code
import {
  getRewardDetail,
  postMystery
} from '../../api/coupon';
import { getQueryString, isApp } from '@ziroom/manticore-utils';
import { ref } from 'vue';
const machine = {
  id: 'coupon',
  initial: 'activity_status%1',
  states: {
    'activity_status%20': {
      explain: '活动-已下线',
      handle: [
        {
          runtime:'entry',
          actions:'handleDownLine',
        },
      ],
    },
    'activity_status%1': {
      explain: '活动-未开始',
      ui: {
        text: '即将开抢'
      },
      handle: [
        {
          runtime:'click',
          actions: 'handleLogin',
        },
      ],
    },
    'activity_status%10': {
      explain: '活动-已结束',
      ui: {
        text: '活动结束'
      },
      handle: [
        {
          runtime:'click',
          actions: 'handleLogin',
        },
      ],
    },
    'status%-10': {
      explain: '领券-即将开始',
      ui: {
        text: '即将开始'
      },
      handle: [
        {
          runtime:'click',
          actions: 'handleLogin',
        },
      ],
    },
    'status%0': {
      explain: '领券-未领取',
      ui: {
        text: '立即抢券'
      },
      handle: [
        {
          runtime:'click',
          actions: 'usePostMystery',
        },
      ],
    },
    'status%10': {
      explain: '领券-已领取',
      ui: {
        text: '已抢到'
      },
    },
    'status%20': {
      explain: '领券-已发光',
      ui: {
        text: '本轮已抢光'
      },
      handle: [
        {
          runtime:'click',
          actions: 'handleLogin',
        },
      ],
    },
  }
};

export const couponData = ref<any>({
  city_code: getQueryString('city_code') || getQueryString('cityCode') || '',
  utm_source: getQueryString('utm_source') || '',
});

export async function useGetCouponInit(data?: any) {
  couponData.value = {
    ...couponData.value,
    ...data
  };
  console.log('function:couponCompontent init');
  const res: any = await getRewardDetail(couponData.value);
  if (!res.isValid) 
    return res.data?.error_code ==='NEED_LOGIN' ? 'NEED_LOGIN' : false;
  return res.data;
}

export async function usePostMystery(data?: any) {
  console.log('领券',data,data.token, couponData.value);
  if (!data.token) return 'NEED_LOGIN';
  const res = await postMystery({
    ...couponData.value,
    ...data,
  });
  console.log('领券接口',res);
  if (!res.isValid) 
    return res.data?.error_code ==='NEED_LOGIN' ? 'NEED_LOGIN' : false;
  return res.data;
}

const handleDownLine = async() => {
  alert('活动已下线');
  if (!isApp()) {
    window.location.replace('https://m.ziroom.com');
  }
}

export function useCoupon<
  TContext extends object,
  TEvent extends EventObject = EventObject,
>(
  implementations: {
    fsmConfig?: StateMachine.Config<TContext, TEvent, any>;
    actions?: StateMachine.ActionMap<TContext, TEvent>;
  } = {}) {
  let machineData = implementations.fsmConfig ? implementations.fsmConfig : machine;
  const { state, send, update } = useMachine(machineData, {
    actions: {
      handleDownLine,
      usePostMystery,
      ...implementations?.actions
    }
  });
  return { state, send, update };
}
