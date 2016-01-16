import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Flux from 'flux';
import * as FluxUtils from 'flux/utils';
import ReactElement = __React.ReactElement;
import {SubtotalBy} from "../models/ColumnLike";
import {ColumnDef} from "../models/ColumnLike";
import {ColumnFormat} from "../models/ColumnLike";
import {Row} from "../models/Row";
import {Column} from "../models/ColumnLike";
import {SubtotalRow} from "../models/Row";
import {DetailRow} from "../models/Row";
import {TableHeaderCell} from "./TableHeaderCell";
import {TreeRasterizer} from "../static/TreeRasterizer";
import {Tree} from "../static/TreeBuilder";
import {GigaStore} from "../store/GigaStore";
import ReduceStore = FluxUtils.ReduceStore;
import Dispatcher = Flux.Dispatcher;
import {GigaAction} from "../store/GigaStore";
import {GigaRow} from "./GigaRow";
import {SortBy} from "../models/ColumnLike";
import {FilterBy} from "../models/ColumnLike";
import {TableWidthChangeAction} from "../store/GigaStore";
import {GigaActionType} from "../store/GigaStore";
import {WidthMeasures} from "../static/WidthMeasureCalculator";
import {WidthMeasureCalculator} from "../static/WidthMeasureCalculator";
import {parsePixelValue} from "../static/WidthMeasureCalculator";
import {validateColumnWidthProperty} from "../static/WidthMeasureCalculator";
import {getScrollBarWidth} from "../static/WidthMeasureCalculator";
import {TableBody} from "./TableBody";
import {ColumnFactory} from "../models/ColumnLike";
import {ColumnGroupDef} from "../models/ColumnLike";
import {TableHeader} from "./TableHeader";
import {ScrollCalculator} from "../static/ScrollCalculator";
import {ChangeRowDisplayBoundsAction} from "../store/GigaStore";

export interface GigaProps extends React.Props<GigaGrid> {
    initialSubtotalBys?:SubtotalBy[]
    initialSortBys?:SortBy[]
    initialFilterBys?:FilterBy[]
    onRowClick?: (row:Row)=>boolean
    onCellClick?: (row:Row, columnDef:Column)=>boolean
    data:any[]
    columnDefs:ColumnDef[]
    columnGroups?:ColumnGroupDef[]
    bodyHeight?:string
    bodyWidth?:string
}

export interface GigaState {

    tree:Tree

    subtotalBys:SubtotalBy[]
    sortBys:SortBy[]
    filterBys: FilterBy[]

    /*
     the displayable view of the data in `tree`
     */
    rasterizedRows: Row[]
    displayStart: number
    displayEnd: number

    widthMeasures: WidthMeasures
}

/**
 * The root component of this React library. assembles raw data into `Row` objects which are then translated into their
 * virtual DOM representation
 *
 * The bulk of the table state is stored in `tree`, which contains subtotal and detail rows
 * Rows can be hidden if filtered out or sorted among other things, subtotal rows can be collapsed etc
 * mutations to the state of table from user initiated actions can be thought of as mutates on the `tree`
 *
 * IMPORTANT: GigaGrid the component does not actually mutate its own state nor give its children the ability
 * to mutate its state. State mutation is managed entirely by the GigaStore flux Store. Events generated by the
 * children of this component are emitted to a central dispatcher and are dispatched to the GigaStore
 *
 * Please DO NOT pass a reference of this component to its children nor call setState() in the component
 */

export class GigaGrid extends React.Component<GigaProps, GigaState> {

    private store:GigaStore;
    private dispatcher:Dispatcher<GigaAction>;
    private canvas:HTMLElement;
    private viewport:HTMLElement;

    constructor(props:GigaProps) {
        super(props);
        this.dispatcher = new Dispatcher<GigaAction>();
        this.store = new GigaStore(this.dispatcher, props);
        this.state = this.store.getState();
        // do not call setState again, this is the only place! otherwise you are violating the principles of Flux
        // not that would be wrong but it would break the 1 way data flow and make keeping track of mutation difficult
        this.store.addListener(()=> {
            this.setState(this.store.getState());
        });
    }

    render() {

        var columns:Column[][];
        if (this.props.columnGroups)
            columns = ColumnFactory.createColumnsFromGroupDefinition(this.props.columnGroups, this.props.columnDefs, this.state);
        else
            columns = [ColumnFactory.createColumnsFromDefinition(this.props.columnDefs, this.state)];

        const bodyStyle = {
            height: this.props.bodyHeight || "100%", // TODO we will need to give similar consideration to height as we did for width
            width: this.state.widthMeasures.bodyWidth
        };

        return (
            <div className="giga-grid">
                <div className="giga-grid-table-header-wrapper" style={{width: this.state.widthMeasures.bodyWidth}}>
                    <table>
                        <TableHeader dispatcher={this.dispatcher} columns={columns}/>
                    </table>
                </div>
                <div ref={c=>this.viewport=c}
                     className="giga-grid-body-scroll-y"
                     onScroll={()=>this.handleScroll()}
                     style={bodyStyle}>
                    <table ref={c=>this.canvas=c}>
                        <TableBody dispatcher={this.dispatcher}
                                   rows={this.state.rasterizedRows}
                                   columns={columns[columns.length-1]}
                                   displayStart={this.state.displayStart}
                                   displayEnd={this.state.displayEnd}
                                   rowHeight={"35px"}
                        />
                    </table>
                </div>
            </div>);
    }

    private handleScroll() {
        this.dispatchDisplayBoundChange();
    }

    private dispatchWidthChange() {
        // if no bodyWidth was provided through props and there are no explicit width set for columns, we need to dynamically the table's bodyWidth
        // after it has been mounted and the parent width is known
        if (this.props.bodyWidth || validateColumnWidthProperty(this.props.columnDefs))
            return;

        const parentWidth = ReactDOM.findDOMNode(this).parentElement.offsetWidth + "px";
        const action = {
            type: GigaActionType.TABLE_WIDTH_CHANGE,
            width: parentWidth
        };
        this.dispatcher.dispatch(action);

    }

    componentDidMount() {
        this.dispatchWidthChange();
        /*
         Trigger resize of table on window resize
         https://github.com/erfangc/GigaGrid/issues/20
         */
        if (typeof window !== "undefined")
            window.addEventListener('resize', this.dispatchWidthChange.bind(this));

        /*
         re-compute displayStart && displayEnd
         */
        this.dispatchDisplayBoundChange();
    }

    private dispatchDisplayBoundChange() {
        // todo do not assume 35px, use a dynamically evaluated value to accomodate runtime idiosyncracies
        const $viewport = $(this.viewport);
        const $canvas = $(this.canvas);
        const action:ChangeRowDisplayBoundsAction = {
            type: GigaActionType.CHANGE_ROW_DISPLAY_BOUNDS,
            canvas: $canvas,
            viewport: $viewport,
            rowHeight: "35px"
        };
        this.dispatcher.dispatch(action);
    }

    componentWillUnmount() {
        /*
         * remove any lingering event listeners
         */
        if (typeof window !== "undefined")
            window.removeEventListener('resize', this.dispatchWidthChange);
    }

}
