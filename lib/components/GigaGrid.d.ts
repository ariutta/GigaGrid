/// <reference types="flux" />
/// <reference types="react" />
import * as React from "react";
import { ClassAttributes } from "react";
import { GigaAction } from "../store/GigaStore";
import { Dispatcher } from "flux";
import { GigaProps } from "./GigaProps";
import { GigaState } from "./GigaState";
export interface GridComponentProps<T> {
    dispatcher: Dispatcher<GigaAction>;
    gridProps?: GigaProps;
}
export interface AdditionalButton {
    name: string;
    customCallback: () => any;
}
/**
 * The root component of this React library. assembles raw data into `Row` objects which are then translated into their
 * virtual DOM representation
 *
 * The bulk of the table state is stored in `tree`, which contains subtotal and detail rows
 * Rows can be hidden if filtered out or sorted among other things, subtotal rows can be collapsed etc
 * mutations to the state of table from user initiated actions can be thought of as mutates on the `tree`
 *
 * **IMPORTANT** GigaGrid the component does not actually mutate its own state nor give its children the ability
 * to mutate its state. State mutation is managed entirely by the GigaStore flux Store. Events generated by the
 * children of this component are emitted to a central dispatcher and are dispatched to the GigaStore
 *
 * **Developer Warning** Please DO NOT pass a reference of this component to its children nor call setState() in the component
 **/
export declare class GigaGrid extends React.Component<GigaProps & ClassAttributes<GigaGrid>, GigaState> {
    private store;
    private dispatcher;
    static defaultProps: GigaProps;
    private static createStore(props, dispatcher);
    constructor(props: GigaProps);
    submitColumnConfigChange(action: GigaAction): void;
    toggleSettingsPopover(): void;
    renderSettingsPopover(): JSX.Element;
    render(): JSX.Element;
    componentWillReceiveProps(nextProps: GigaProps): void;
    private calculatePlaceholderHeight();
    /**
     * I don't love this, but it's only related to scrolling and has nothing to do with state/rendering of the component
     * so rather than making a re-render happen with a state change, we do this.  This is to fix this problem:
     * http://stackoverflow.com/questions/26326958/stopping-mousewheel-event-from-happening-twice-in-osx
     */
    private shouldScroll;
    private handleVerticalScroll;
    /**
     * A wheely important function.  You can't scroll normally in the left-headers area, but a user would expect the
     * table to scroll if he or she uses the mousewheel.  So we have to listen for this event.
     */
    private handleWheelScroll;
    private handleHorizontalScroll;
    private dispatchDisplayBoundChange();
    reflowTable(): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
}
export declare function getHorizontalScrollbarThickness(): number;
