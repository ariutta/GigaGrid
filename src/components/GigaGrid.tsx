///<reference path="../../jspm_packages/npm/immutable@3.7.6/dist/immutable.d.ts"/>

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Flux from 'flux';
import * as FluxUtils from 'flux/utils';
import * as Immutable from 'immutable';
import ReactElement = __React.ReactElement;
import {SubtotalBy} from "../models/ColumnLike";
import {ColumnDef} from "../models/ColumnLike";
import {ColumnFormat} from "../models/ColumnLike";
import {Row} from "../models/Row";
import {TableRowColumnDef} from "../models/ColumnLike";
import {SubtotalRow} from "../models/Row";
import {DetailRow} from "../models/Row";
import {TableHeader} from "./TableHeader";
import {TreeRasterizer} from "../static/TreeRasterizer";
import {Tree} from "../static/TreeBuilder";
import {GigaStore} from "../store/GigaStore";
import ReduceStore = FluxUtils.ReduceStore;
import Dispatcher = Flux.Dispatcher;
import {GigaAction} from "../store/GigaStore";
import {TableRow} from "./TableRow";
import {SortBy} from "../models/ColumnLike";
import {FilterBy} from "../models/ColumnLike";
import {TableWidthChangeAction} from "../store/GigaStore";
import {GigaActionType} from "../store/GigaStore";
import {WidthMeasures} from "../static/WidthMeasureCalculator";
import {WidthMeasureCalculator} from "../static/WidthMeasureCalculator";
import {parsePixelValue} from "../static/WidthMeasureCalculator";
import {validateColumnWidthProperty} from "../static/WidthMeasureCalculator";
import {getScrollBarWidth} from "../static/WidthMeasureCalculator";

export interface GigaProps extends React.Props<GigaGrid> {
    initialSubtotalBys?:SubtotalBy[]
    initialSortBys?:SortBy[]
    initialFilterBys?:FilterBy[]
    onRowClick?: (row:Row)=>boolean
    onCellClick?: (row:Row, columnDef:TableRowColumnDef)=>boolean
    data:any[]
    columnDefs:ColumnDef[]
    bodyHeight?:string
    bodyWidth?:string
}

export interface GigaState {
    tree:Tree
    subtotalBys:SubtotalBy[]
    sortBys:SortBy[]
    filterBys: FilterBy[]
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

        const tableRowColumnDefs:TableRowColumnDef[] = this.transformColumnDef(this.props.columnDefs, this.state);

        const bodyStyle = {
            height: this.props.bodyHeight || "100%", // TODO we will need to give similar consideration to height as we did for width
            width: this.state.widthMeasures.bodyWidth
        };

        return (
            <div className="giga-grid">
                <div style={{width: this.state.widthMeasures.bodyWidth}}>
                    <table>
                        {this.renderColumnHeaders(tableRowColumnDefs)}
                    </table>
                </div>
                <div className="giga-grid-body-scroll-y" style={bodyStyle}>
                    <table>
                        <tbody>
                            {this.renderTableRows(tableRowColumnDefs)}
                        </tbody>
                    </table>
                </div>
            </div>);
    }

    private transformColumnDef(columnDefs:ColumnDef[], state:GigaState):TableRowColumnDef[] {

        return columnDefs.map(cd => {

            const tableRowCD:TableRowColumnDef = {
                colTag: cd.colTag,
                title: cd.title,
                aggregationMethod: cd.aggregationMethod,
                format: cd.format,
                width: state.widthMeasures.columnWidths[cd.colTag],
                cellTemplateCreator: cd.cellTemplateCreator
            };

            // determine if there is an existing SortBy for this column
            var sortBy = Immutable.List<SortBy>(state.sortBys).find((s)=>s.colTag === cd.colTag);
            if (sortBy) {
                tableRowCD.sortDirection = sortBy.direction;
                tableRowCD.customSortFn = sortBy.customSortFn;
            }

            return tableRowCD;
        });

    };

    private renderColumnHeaders(tableRowColumnDefs:TableRowColumnDef[]):ReactElement<{}> {
        const ths = tableRowColumnDefs.map((colDef:TableRowColumnDef, i:number)=> {
            return <TableHeader tableColumnDef={colDef} key={i} isFirstColumn={i===0}
                                isLastColumn={i===tableRowColumnDefs.length-1} dispatcher={this.dispatcher}/>
        });

        const scrollBarWidth = getScrollBarWidth();

        /*
         add an placeholder to align the header with cells
         https://github.com/erfangc/GigaGrid/issues/7
         */
        ths.push(<th key="placeholder" style={{width: scrollBarWidth + "px"}}/>);
        return (
            <thead>
                <tr>{ths}</tr>
            </thead>
        );
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
    }

    componentWillUnmount() {
        /*
         * remove any lingering event listeners
         */
        if (typeof window !== "undefined")
            window.removeEventListener('resize', this.dispatchWidthChange);
    }

    renderTableRows(tableRowColumnDefs:TableRowColumnDef[]):ReactElement<{}>[] {
        // todo we should identify state chgs that require re-rasterization and only rasterize then
        const rows:Row[] = TreeRasterizer.rasterize(this.state.tree);
        // convert plain ColumnDef to TableRowColumnDef which has additional properties
        return rows.map((row:Row, i:number)=> {
            return <TableRow key={i}
                             tableRowColumnDefs={tableRowColumnDefs}
                             row={row as DetailRow}
                             dispatcher={this.dispatcher}/>;
        });
    }

}
