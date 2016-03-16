import {Row} from "./Row";
import {GigaState} from "../components/GigaGrid";
import * as _ from 'lodash';
import {DetailRow} from "./Row";

export enum AggregationMethod {
    SUM, WEIGHTED_AVERAGE, AVERAGE, RANGE, COUNT, COUNT_DISTINCT, COUNT_OR_DISTINCT, NONE
}

export enum ColumnFormat {
    NUMBER, STRING, CURRENCY, DATE
}

export interface ColumnLike {
    colTag: string
    title?: string
    format?: ColumnFormat
    aggregationMethod?:AggregationMethod
}

export enum SortDirection {
    ASC, DESC
}

export interface FormatInstruction {
    roundTo?:number
    multiplier?:number
    separator?:boolean
}

export interface ColumnDef extends ColumnLike {
    width?:string
    weightBy?:string
    formatInstruction?: FormatInstruction
    cellTemplateCreator?:(data:any, column?:Column)=>JSX.Element
}

export interface Column extends ColumnDef {
    sortDirection?: SortDirection
    customSortFn?:(a:Row, b:Row)=>number
    colSpan?: number
}

export interface FilterBy extends ColumnLike {
    predicate: (a:any)=>boolean
}

export interface SubtotalBy extends ColumnLike {
    groupBy?:(detailRow:DetailRow)=>string
}

export interface SortBy {
    colTag:string;
    format: ColumnFormat;
    customSortFn?:(a:Row, b:Row)=>number; // UDF for sorting
    direction: SortDirection
}

export interface ColumnGroupDef {
    title: string
    columns: string[] // colTags
}

export class ColumnFactory {

    /**
     * create an array of Column from definitions
     * @param columnDefs
     * @param state
     * @returns {Column[]}
     */
    static createColumnsFromDefinition(columnDefs:ColumnDef[], state:GigaState):Column[] {
        const maskedTags = (state.columnDefMask || []).map(m=>m.colTag);
        return columnDefs.filter(cd=>maskedTags.indexOf(cd.colTag) === -1).map(cd => ColumnFactory.createColumnFromDefinition(cd, state));
    }

    /**
     * creates a single Column object from a ColumnDef (definition)
     * Column objects contain more rendering hints than ColumnDef objects which are passed in by the user
     * @param cd
     * @param state
     * @returns {Column}
     */
    static createColumnFromDefinition(cd:ColumnDef, state:GigaState):Column {
        const column:Column = {
            colTag: cd.colTag,
            title: cd.title,
            aggregationMethod: cd.aggregationMethod,
            format: cd.format,
            width: state.widthMeasures.columnWidths[cd.colTag],
            cellTemplateCreator: cd.cellTemplateCreator
        };

        // determine if there is an existing SortBy for this column
        var sortBy = _.find(state.sortBys, s=>s.colTag === cd.colTag);

        if (sortBy) {
            column.sortDirection = sortBy.direction;
            column.customSortFn = sortBy.customSortFn;
        }

        return column;
    }

    /**
     * Create a 2-dimensional structure of Column(s), this allow us to group column headers
     * @param columnGroupDefs
     * @param columnDefs
     * @param state
     * @returns {Column[][]}
     */
    static createColumnsFromGroupDefinition(columnGroupDefs:ColumnGroupDef[], columnDefs:ColumnDef[], state:GigaState):Column[][] {

        const columns = ColumnFactory.createColumnsFromDefinition(columnDefs, state);
        const columnMap = _.chain(columns).map((column:Column)=>column.colTag).object(columns).value();
        const nestedColumns:Column[][] = [[], []];
        _.forEach(columnGroupDefs, (groupDef:ColumnGroupDef, i:number)=> {
            nestedColumns[0].push({
                colTag: `column_group_${i + 1}`,
                title: groupDef.title,
                colSpan: groupDef.columns.length
            });
            _.forEach(groupDef.columns, colTag=>nestedColumns[1].push(columnMap[colTag]));
        });
        return nestedColumns;

    }
}