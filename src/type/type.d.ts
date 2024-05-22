type Runnable<T> = (param: T) => void;
type Callback = () => void;
type AsyncCallback = () => Promise<void>;