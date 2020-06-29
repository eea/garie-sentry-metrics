const basic_operators = ['equals', 'contains', 'startsWith'];
const list_operators = ['or', 'and'];

function parseExpr(tree, item){
    tree.operator = tree.operator.toLowerCase().trim();
    if (basic_operators.includes(tree.operator)){
        var field_val;
        if (tree.field.startsWith('tags.')){
            field_val = item.tags_obj.tags[tree.field.substr(5)];
        }
        else {
            field_val = item[tree.field];
        }
        if (field_val === undefined){
            return false;
        }
        if (tree.operator === 'equals'){
            if (field_val === tree.value){
                return true;
            }
            else {
                return false;
            }
        }
        if (tree.operator === 'contains'){
            if (field_val.indexOf(tree.value) !== -1){
                return true;
            }
            else {
                return false;
            }
        }
        if (tree.operator === 'startsWith'){
            if (field_val.startsWith(tree.value)){
                return true;
            }
            else {
                return false;
            }
        }
    }
    if (tree.operator === 'not'){
        return (!parseExpr(tree.operand, item));
    }
    if (list_operators.includes(tree.operator)){
        var result;
        tree.operands.forEach(function(subtree){
            var tmp_value = parseExpr(subtree, item);
            if (result === undefined){
                result = tmp_value;
            }
            else{
                if (tree.operator === 'or'){
                    result = result || tmp_value;
                }
                if (tree.operator === 'and'){
                    result = result && tmp_value;
                }
            }
        })
        return result;
    }
}

module.exports = {
    parseExpr
}