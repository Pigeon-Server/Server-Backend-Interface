type Runnable<T> = (param: T) => void;
type Callback<T, R> = (param: T) => R;
type Callable = () => void;
type Nullable<T> = T | null
type Player = {
    username: string,
    uuid: string
}