/**
 * デバッグモードで実行されているかどうかです。
 */
let isDebugMode = false;

for (const envName of ["DEBUG", "RUNNER_DEBUG", "ACTIONS_STEP_DEBUG", "ACTIONS_RUNNER_DEBUG"]) {
  const envValue = process.env[envName]?.toLocaleLowerCase();
  switch (envValue) {
    case "":
    case "1":
    case "true":
      isDebugMode = true;
      break;
  }

  if (isDebugMode) {
    break;
  }
}

export default isDebugMode;
