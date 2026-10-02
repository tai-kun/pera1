/**
 * React の `act(...)` をテスト環境で有効にするためのフラグです。
 *
 * @see https://react.dev/link/the-current-testing-environment-is-not-configured-to-support-act
 */
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
