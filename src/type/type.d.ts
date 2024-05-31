type Runnable<T> = (param: T) => void;
type Callback = () => void;
type AsyncCallback = () => Promise<void>;
type Override<P, S> = Omit<P, keyof S> & S;